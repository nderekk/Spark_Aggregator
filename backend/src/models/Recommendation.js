const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
    source_course_id: { type: String, required: true, index: true },
    recommended_course_id: { type: String, required: true },
    score: Number,
    rank: Number
}, { 
    // THIS IS THE KEY: Force the exact collection name from your screenshot
    collection: 'course_recommendations' 
});

module.exports = mongoose.model('CourseRecommendation', RecommendationSchema);