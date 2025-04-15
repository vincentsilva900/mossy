// /routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');

function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

router.get('/profile', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId).populate('friends');
  const posts = await Post.find({ user: { $in: [...user.friends, user._id] } })
    .populate('user')
    .sort({ createdAt: -1 });
  res.render('layout', { content: 'profile', user, posts });
});

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/post', isLoggedIn, async (req, res) => {
  let imageUrl = '';
  if (req.files && req.files.image) {
    const file = req.files.image;
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: 'mossy_posts'
    });
    imageUrl = result.secure_url;
  }

  await Post.create({
    user: req.session.userId,
    content: req.body.content,
    image: imageUrl
  });

  res.redirect('/user/profile');
});


router.post('/like/:id', isLoggedIn, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post.likes.includes(req.session.userId)) {
    post.likes.push(req.session.userId);
    await post.save();
  }
  res.redirect('/user/profile');
});

router.get('/:id', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.params.id).populate('friends');
  const posts = await Post.find({ user: user._id }).populate('user');
  res.render('layout', { content: 'userProfile', user, posts });
});

router.post('/friend/:id', isLoggedIn, async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  const targetUser = await User.findById(req.params.id);
  if (!currentUser.friends.includes(targetUser._id)) {
    currentUser.friends.push(targetUser._id);
    await currentUser.save();
  }
  res.redirect(`/user/${req.params.id}`);
});

router.post('/unfriend/:id', isLoggedIn, async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  currentUser.friends.pull(req.params.id);
  await currentUser.save();
  res.redirect(`/user/${req.params.id}`);
});

module.exports = router;
