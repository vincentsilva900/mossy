const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  image: String,
  text: String
});

const mossbookSchema = new mongoose.Schema({
  title: String,
  coverImage: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pages: { type: [pageSchema], default: Array(25).fill({}) }
});

module.exports = mongoose.model('Mossbook', mossbookSchema);
