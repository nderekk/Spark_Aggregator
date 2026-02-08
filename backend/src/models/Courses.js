const mongoose = require('mongoose');

// Define Course schema and normalize fields
const courseSchema = new mongoose.Schema({
    externalId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    language: { type: String, default: "en" }, 
    level: { type: String, default: "Beginner" }, 
    category: { type: String, default: "General" },
    keywords: [{ type: String }],
    source: { type: String }, 
    provider: { type: String },
    url: { type: String },
    similarCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }] 
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);