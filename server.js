require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const Post = require('./models/Post');
const User = require('./models/User');

const app = express();
const PORT = 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error(err));

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  app.get('/test-cloudinary', async (req, res) => {
    try {
      const result = await cloudinary.api.resources({ max_results: 1 });
      res.send('✅ Cloudinary connected! Found some resources.');
    } catch (error) {
      console.error(error);
      res.status(500).send('❌ Cloudinary not connected properly.');
    }
  });
// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Fake login (for now just set current user manually)
let currentUserId = ''; // Will fill after creating a user

// Routes
app.get('/', async (req, res) => {
  const currentUser = await User.findById(currentUserId).populate('friends');
  const posts = await Post.find({
    username: { $in: currentUser.friends.map(f => f.username).concat(currentUser.username) }
  }).sort({ createdAt: -1 });

  res.render('index', { posts, moment, currentUser });
});

app.post('/create-post', async (req, res) => {
  const { username, content } = req.body;
  await Post.create({ username, content });
  res.redirect('/');
});

// Friend Requests
app.get('/friends', async (req, res) => {
  const currentUser = await User.findById(currentUserId).populate('friendRequests');
  const users = await User.find({ _id: { $ne: currentUserId } });
  res.render('friends', { users, currentUser });
});

app.post('/send-request/:id', async (req, res) => {
  const userToAdd = await User.findById(req.params.id);
  userToAdd.friendRequests.push(currentUserId);
  await userToAdd.save();
  res.redirect('/friends');
});

app.post('/accept-request/:id', async (req, res) => {
  const currentUser = await User.findById(currentUserId);
  const newFriend = await User.findById(req.params.id);

  // Add each other as friends
  currentUser.friends.push(newFriend._id);
  newFriend.friends.push(currentUser._id);

  // Remove request
  currentUser.friendRequests = currentUser.friendRequests.filter(
    id => id.toString() !== newFriend._id.toString()
  );

  await currentUser.save();
  await newFriend.save();

  res.redirect('/friends');
});

// Server start
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // TEMP: Auto-create user for testing
  let user = await User.findOne({ username: 'swampwitch' });
  if (!user) {
    user = await User.create({ username: 'swampwitch' });
  }
  currentUserId = user._id;
});