const mongoose = require('mongoose');
const mossbookSchema = new mongoose.Schema({
  title: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pages: [{
    image: String,
    text: String,
    locked: { type: Boolean, default: false }
  }]
  
});
module.exports = mongoose.model('Mossbook', mossbookSchema);
