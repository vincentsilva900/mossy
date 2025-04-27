const mongoose = require('mongoose');

const mossbeaconMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  musicLink: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MossbeaconMessage', mossbeaconMessageSchema);
