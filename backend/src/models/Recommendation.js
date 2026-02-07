const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
    source_course_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true,
        index: true
    },
    recommended_course_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        required: true,
        index: true
    },
    score: Number,
    rank: Number
});

module.exports = mongoose.model('CourseRecommendation', RecommendationSchema);