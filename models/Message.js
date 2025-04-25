const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  image: { type: String }, // 🌸 optional image
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Message', messageSchema);
