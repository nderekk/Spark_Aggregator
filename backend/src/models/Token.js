const moongoose = require('mongoose');

const tokenSchema = new moongoose.Schema({
    userId: { type: moongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 } 
});

module.exports = moongoose.model('Token', tokenSchema);