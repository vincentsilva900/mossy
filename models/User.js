const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  profilePic: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  profileSong: { type: String, default: '' },
  songBoxColor: { type: String, default: '#ffebf7' },
  mossbeacon: { type: Boolean, default: false }, // <<<< add this
  backgroundImage: {
    type: String, // This will hold the Cloudinary URL or a relative path
    default: '/images/bg-mossy-portal.jpg',
  },
  
});


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
