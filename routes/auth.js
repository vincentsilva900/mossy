// /routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get('/', (req, res) => {
  res.render('layout', { content: 'index', pageClass: '' });
});

router.get('/signup', (req, res) => {
  res.render('layout', { content: 'signup' });
});

router.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;
      let profilePic = '/images/default.png';
  
      // Check if file exists
      if (req.files && req.files.profilePic) {
        const file = req.files.profilePic;
  
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
            folder: 'mossy_profiles'
          });
          
        profilePic = result.secure_url;
      }
  
      const user = new User({ username, password, profilePic });
      await user.save();
  
      req.session.userId = user._id;
      res.redirect('/user/profile');
    } catch (err) {
      console.error('❌ SIGNUP ERROR:', err);
      res.status(500).send("Internal Server Error. Check your terminal or logs.");
    }
  });
  

router.get('/login', (req, res) => {
  res.render('layout', { content: 'login' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await user.comparePassword(password))) {
    return res.redirect('/login');
  }
  req.session.userId = user._id;
  res.redirect('/user/profile');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
  
module.exports = router;
