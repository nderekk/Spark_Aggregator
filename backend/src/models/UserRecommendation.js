const mongoose = require('mongoose');

const UserRecommendationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Spark saves this as String
    recommendedCourseIds: [{ type: String }]  // Array of Course ID strings
}, { collection: 'user_recommendations' }); // Explicitly match the collection name

module.exports = mongoose.model('UserRecommendation', UserRecommendationSchema);