// 📁 models/Wish.js
const mongoose = require('mongoose');

const wishSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true, maxlength: 180 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  water: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

wishSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Wish', wishSchema);