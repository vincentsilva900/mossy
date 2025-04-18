// 📁 models/Shadow.js
const mongoose = require('mongoose');
const shadowSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    reactions: {
      stone: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      mist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    createdAt: { type: Date, default: Date.now }
  });
  

module.exports = mongoose.model('Shadow', shadowSchema);