const Course = require('../models/Courses');
const User = require('../models/Users');
const Recommendation = require('../models/Recommendation');
const UserRecommendation = require('../models/UserRecommendation');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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
        if (!course) return res.status(404).json({ message: "Course not found" });

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
                replacement: {
                    ...course,
                    source: course.source
                },
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

const getAvailableSources = async (req, res) => {
    try {
        const connectorsPath = path.join(__dirname, '../services/connectors');

        console.log('Checking connectors directory at:', connectorsPath);
        
        if(!fs.existsSync(connectorsPath)) {
            return res.status(404).json({ error: 'Connectors directory not found' });
        }
        const files = fs.readdirSync(connectorsPath);
        const sources = files
            .filter(file => file.endsWith('.js'))
            .map(file => file.replace('.js', ''));
            
        res.json({ sources });
    } catch (error) {
        console.error('Error fetching sources:', error);
        res.status(500).json({ error: 'Failed to fetch sources' });
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

const postFavoriteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.userID;

        const updatedUser = await User.findByIdAndUpdate(
            userID,
            { $addToSet: { favoriteCourses: id } }, // Adds course ID if it's not already there
            { new: true } // Returns the updated user
        ).populate('favoriteCourses'); // Fills the array with full course data

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            favoriteCourses: updatedUser.favoriteCourses
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add course to favorites.' });
    }   

};

const deleteFavoriteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.userID;

        const updatedUser = await User.findByIdAndUpdate(
            userID,
            { $pull: { favoriteCourses: id } }, // Removes the course ID from the array
            { new: true }
        ).populate('favoriteCourses');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            message: 'Course removed from favorites.',
            favoriteCourses: updatedUser.favoriteCourses
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove course from favorites.' });
    }
};

const getFavoriteCourses = async (req, res) => {
    try {
        const userID = req.userID;

        const user = await User.findById(userID)
            .populate({
                path: 'favoriteCourses',
                model: 'Course'
            })
            .select('favoriteCourses');

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            count: user.favoriteCourses.length,
            favoriteCourses: user.favoriteCourses
        });
    } catch (error) {
        console.error("Error fetching favorite courses:", error);
        res.status(500).json({ error: 'Failed to fetch favorite courses.' });
    }

};

const postRecentlyViewedCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const userID = req.userID;

        //First delete the course if it already exists in the field, so it renews the timestamp
        await User.updateOne(
            { _id: userID },
            { $pull: { recentlyViewed: { courseId: id } } }
        );

        const updatedUser = await User.findByIdAndUpdate(
            userID,
            {
                $push: {
                    recentlyViewed: {
                        $each: [{ courseId: id, viewedAt: new Date() }],
                        $position: 0, // Moves to the front of the list
                        $slice: 30    // Keeps only the last 30 viewed items
                    }
                }
            },
            { new: true }
        ).populate('recentlyViewed.courseId');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json({
            recentlyViewed: updatedUser.recentlyViewed
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update recently viewed courses.' });
    }

};

const getRecentlyViewedCourses = async (req, res) => {
    try {
        const userID = req.userID;

        const user = await User.findById(userID)
            .populate({
                path: 'recentlyViewed.courseId',
                model: 'Course'
            })
            .select('recentlyViewed'); 

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json(user.recentlyViewed);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recently viewed courses.' });
    }
};


const syncAllSources = async (req, res) => {
    try {
        const connectorsPath = path.join(__dirname, '../services/connectors');
        const files = fs.readdirSync(connectorsPath);
        const sources = files
            .filter(file => file.endsWith('.js'))
            .map(file => file.replace('.js', ''));

        let totalAdded = 0;
        const results = [];

        for (const source of sources) {
            try {
                const connector = require(`../services/connectors/${source}.js`);
                const data = await connector.getCourses();
                const normalized = connector.normalize(data);

                const bulkOps = normalized.map(course => ({
                    replaceOne: {
                        filter: { externalId: course.externalId },
                        replacement: { ...course },
                        upsert: true
                    }
                }));

                if (bulkOps.length > 0) {
                    await Course.bulkWrite(bulkOps);
                    totalAdded += normalized.length;
                    results.push({ source, status: 'success', count: normalized.length });
                }
            } catch (err) {
                console.error(`Error syncing ${source}:`, err);
                results.push({ source, status: 'failed', error: err.message });
            }
        }

        res.json({ 
            message: "Global sync completed", 
            added: totalAdded,
            details: results 
        });
    } catch (error) {
        res.status(500).json({ error: 'Global sync failed: ' + error.message });
    }
};

const getPersonalisedCourses = async (req, res) => {
    try {
        const userId = req.userID; 

        // Find the list of IDs recommended for this user
        const recommendationDoc = await UserRecommendation.findOne({ userId: userId });

        if (!recommendationDoc || !recommendationDoc.recommendedCourseIds.length) {
            return res.status(200).json({ recommendations: [] });
        }

        // Fetch the full course details for those IDs
        const courseIds = recommendationDoc.recommendedCourseIds.map(id => new mongoose.Types.ObjectId(id));

        const recommendedCourses = await Course.find({
            '_id': { $in: courseIds }
        });

        res.status(200).json({ recommendations: recommendedCourses });

    } catch (error) {
        console.error("Recommendation Error:", error);
        res.status(500).json({ message: "Error fetching recommendations" });
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
    getCourse,
    postFavoriteCourse,
    getFavoriteCourses,
    deleteFavoriteCourse,
    postRecentlyViewedCourse,
    getRecentlyViewedCourses,
    syncAllSources,
    getAvailableSources,
    getPersonalisedCourses
};