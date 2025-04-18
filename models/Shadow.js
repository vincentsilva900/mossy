// 📁 models/Shadow.js
const mongoose = require('mongoose');

const shadowSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true, maxlength: 300 },
  createdAt: { type: Date, default: Date.now },
  glowReacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  mistReacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Shadow', shadowSchema);