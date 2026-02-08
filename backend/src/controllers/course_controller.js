const Course = require('../models/Courses');
const Recommendation = require('../models/Recommendation');
const mongoose = require('mongoose');

const createCourse = async (req, res) => {
    try {
        const { 
            title, provider, externalId, url, 
            description, language, level, category, keywords, source 
        } = req.body;
        const newCourse = new Course({ 
            title, provider, externalId, url, 
            description, language, level, category, keywords, source 
        });
        await newCourse.save();
        res.status(201).json(newCourse);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create course' });
    }   
};

const getAllCourses = async (req, res) => {
    try {
        const { page = 1, limit = 10, provider, title, language, level, category} = req.query;

        const query = {};
        if (provider) query.provider = provider;
        if (title) query.title = { $regex: title, $options: 'i' };
        if (language) query.language = language;
        if (level) query.level = level;
        if (category) query.category = category;
        

        const courses = await Course.find(query)
            .sort({ createdAt: -1 })
            .exec();


        const count = await Course.countDocuments(query);

        res.json({
            courses,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalResults: count
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};

const getCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findById(id);

        res.json({
            course
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
};


const getSimilarCourses = async (req, res) => {
    try {
        const { id } = req.params;

        const recommendations = await Recommendation.find({
            $or: [
                { source_course_id: id },
                { recommended_course_id: id }
            ]
        })
        .sort({ rank: 1 })
        .limit(5)
        .lean();
        if (!recommendations.length) return res.json([]);

        // 2. Fetch the actual course documents using the recommended IDs
        const recommendedCourseIds = recommendations.map(r => r.recommended_course_id === id ? r.source_course_id : r.recommended_course_id);
        const courses = await Course.find({ _id: { $in: recommendedCourseIds } }).lean();

        // 3. Merge them so React gets the course data + the score
        const results = recommendations.map(rec => {
            const targetId = rec.recommended_course_id === id ? rec.source_course_id : rec.recommended_course_id;
            const courseData = courses.find(c => c._id.toString() === targetId);
            return courseData ? { ...courseData, score: rec.score } : null;
        }).filter(Boolean);

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const syncSource = async (req, res) => {
    try {
        const { source } = req.params;

        let connector;
        try {
            connector = require(`../services/connectors/${source}.js`);
        } catch (err) {
            console.error(`Connector for source ${source} not found:`, err);
            return res.status(400).json({ error: `Provider ${source} is not supported yet.` });
        }

        const data = await connector.getCourses();
        const normalized = connector.normalize(data);

        const bulkOps = normalized.map(course => ({
            replaceOne: {
                filter: { externalId: course.externalId },
                replacement: course,
                upsert: true
            }
        }));
        if (bulkOps.length > 0) {
            await Course.bulkWrite(bulkOps);
        }


        return res.json({ 
            message: "Sync successful", 
            source, 
            count: normalized.length 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(course);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch course' });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedCourse = await Course.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedCourse) {
            return res.status(404).json({ error: 'Course not found' });
        }   

        res.json(updatedCourse);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update course' });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCourse = await Course.findByIdAndDelete(id);
        if (!deletedCourse) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete course' });
    }   

};



module.exports = {
    getAllCourses,
    getCourseById : getCourse,
    getSimilarCourses,
    syncSource,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourse
};