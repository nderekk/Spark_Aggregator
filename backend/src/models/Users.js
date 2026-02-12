const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    permissionLevel: { type: Number, default: 1 },
    favoriteCourses: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course' 
    }],
    recentlyViewed: [{
        //Keeps the courseID
        courseId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Course' 
        },
        //and when that course was added
        viewedAt: { 
            type: Date, 
            default: Date.now 
        }
    }]
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);