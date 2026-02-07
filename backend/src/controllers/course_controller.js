const repoA = require('../services/connectors/repo_a_connector');
const Course = require('../models/Courses');

const createCourse = async (req, res) => {
    try {
        const { title, provider, externalId, url } = req.body;
        const newCourse = new Course({ title, provider, externalId, url });
        await newCourse.save();
        res.status(201).json(newCourse);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create course' });
    }   
};

const getAllCourses = async (req, res) => {
    try {
        const { page = 1, limit = 10, provider, title } = req.query;

        const query = {};
        if (provider) query.provider = provider;
        if (title) query.title = { $regex: title, $options: 'i' }; // Αναζήτηση με μέρος του τίτλου

        const courses = await Course.find(query);

        const count = await Course.countDocuments(query);

        res.json({
            courses,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page)
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
        // call spark api here , to do recommendation
        const currentCourse = await Course.findById(id);
        if (!currentCourse) return res.status(404).json({ error: 'Not found' });

        const similar = await Course.find({ 
            provider: currentCourse.provider, 
            _id: { $ne: id } 
        }).limit(3);

        res.json(similar);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
};

const syncSource = async (req, res) => {
    try {
        const { source } = req.params;

        let connector;
        try {
            connector = require(`../services/connectors/${source}`);
        } catch (err) {
            return res.status(400).json({ error: `Provider ${source} is not supported yet.` });
        }

        const data = await connector.getCourses();
        const normalized = connector.normalize(data);

        for (const c of normalized) {
            await Course.findOneAndUpdate(
                { externalId: c.externalId }, 
                { ...c, source: source }, 
                { upsert: true, new: true }
            );
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
    getCourseById,
    getSimilarCourses,
    syncSource,
    createCourse,
    updateCourse,
    deleteCourse,
    getCourse
};