// /routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
// ADD to routes/user.js
const fs = require('fs'); // In case you handle local image deletions in the future

const { unlink } = require('fs/promises'); // For deleting temp files if needed
function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

router.get('/profile', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId)
  .populate('friends')
  .populate('friendRequests');

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
router.post('/delete-post/:id', isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.user.toString() !== req.session.userId) {
      return res.send(`<script>alert("🚫 You can only delete your own posts!"); window.location.href = "/user/profile";</script>`);

    }

    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/user/profile');
  } catch (err) {
    console.error("❌ Error deleting post:", err);
    res.status(500).send("Oops! Couldn't delete this post.");
  }
});

router.post('/delete-profile-pic', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId);
  user.profilePic = '/images/default-profile.jpg';
  await user.save();
  res.redirect('/user/profile');
});

router.post('/update-profile-pic', isLoggedIn, async (req, res) => {
  try {
    if (!req.files || !req.files.profilePic) return res.redirect('/user/profile');
    const result = await cloudinary.uploader.upload(req.files.profilePic.tempFilePath, {
      folder: 'mossy_profile_pics'
    });
    const user = await User.findById(req.session.userId);
    user.profilePic = result.secure_url;
    await user.save();
    res.redirect('/user/profile');
  } catch (err) {
    console.error("❌ Error updating profile picture:", err);
    res.status(500).send("Couldn't update your profile pic");
  }
});
router.post('/song', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId);
  let song = req.body.profileSong.trim();

  // Sanitize embed
  const iframeMatch = song.match(/src="(.*?)"/);
  if (iframeMatch) song = iframeMatch[1];
  if (song.includes('youtube.com/watch?v=')) {
    const id = song.split('v=')[1].split('&')[0];
    song = `https://www.youtube.com/embed/${id}`;
  }
  if (song.includes('youtu.be/')) {
    const id = song.split('youtu.be/')[1];
    song = `https://www.youtube.com/embed/${id}`;
  }
  if (song.includes('open.spotify.com/track/')) {
    const id = song.split('/track/')[1].split('?')[0];
    song = `https://open.spotify.com/embed/track/${id}`;
  }

  // Save song + box color
  user.profileSong = song;
  user.songBoxColor = req.body.songBoxColor || '#ffebf7';
  await user.save();
  res.redirect('/user/profile');
});


router.get('/clearsong', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId);
  user.profileSong = '';
  await user.save();
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

router.get('/search', isLoggedIn, async (req, res) => {
  const query = req.query.username?.trim();

  if (!query) return res.redirect('/user/profile');

  const users = await User.find({
    username: { $regex: new RegExp(query, 'i') }
  }).populate('friends'); // 🔥 Needed for friend button logic

  res.render('layout', { content: 'searchResults', users });
});


router.post('/request/:id', isLoggedIn, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    const me = await User.findById(req.session.userId);

    if (
      !target ||
      target._id.equals(me._id) ||
      target.friendRequests.includes(me._id) ||
      target.friends.includes(me._id)
    ) {
      return res.redirect(`/user/${req.params.id}`);
    }

    target.friendRequests.push(me._id);
    await target.save();

    res.redirect(`/user/${req.params.id}`);
  } catch (err) {
    console.error("❌ Error sending friend request:", err);
    res.status(500).send("Oops! Couldn't send that friend request.");
  }
});


router.post('/accept/:id', isLoggedIn, async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  const requestor = await User.findById(req.params.id);

  if (currentUser.friendRequests.includes(requestor._id)) {
    currentUser.friends.push(requestor._id);
    requestor.friends.push(currentUser._id);

    currentUser.friendRequests.pull(requestor._id);
    await currentUser.save();
    await requestor.save();
  }

  res.redirect('/user/profile');
});


router.post('/decline/:id', isLoggedIn, async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  currentUser.friendRequests.pull(req.params.id);
  await currentUser.save();
  res.redirect('/user/profile');
});



router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends')
      .populate('friendRequests');

    const posts = await Post.find({ user: user._id })
      .populate('user')
      .sort({ createdAt: -1 });

    res.render('layout', { content: 'userProfile', user, posts });
  } catch (err) {
    console.error("❌ Error loading user profile:", err);
    res.status(500).send("Oops! Could not load this user's profile.");
  }
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
  const otherUser = await User.findById(req.params.id);

  currentUser.friends.pull(otherUser._id);
  otherUser.friends.pull(currentUser._id);

  await currentUser.save();
  await otherUser.save();

  res.redirect(`/user/${req.params.id}`);
});


module.exports = router;
