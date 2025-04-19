const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });

const Mossbook = require('../models/Mossbook');
const User = require('../models/User');

// Middleware to protect routes
const isLoggedIn = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// 📚 GET all Mossbooks (Dashboard)
router.get('/mossbook', isLoggedIn, async (req, res) => {
  const mossbooks = await Mossbook.find({
    $or: [
      { owner: req.session.userId },
      { members: req.session.userId }
    ]
  }).populate('members');

  res.render('layout', {
    content: 'mossbookDashboard',
    mossbooks,
    pageClass: 'mossbook-mode'
  });
});

// 🌱 CREATE a new Mossbook
router.post('/mossbook', isLoggedIn, async (req, res) => {
  const usernames = req.body.members
    ? req.body.members.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  const foundUsers = await User.find({ username: { $in: usernames } });

  const newBook = new Mossbook({
    title: req.body.title,
    owner: req.session.userId,
    members: foundUsers.map(u => u._id),
    pages: Array(25).fill({})
  });

  await newBook.save();
  res.redirect(`/mossbook/${newBook._id}/page/0`);
});

// ❌ DELETE Mossbook (Creator only)
router.post('/mossbook/:id/delete', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (mossbook.owner.equals(req.session.userId)) {
    await Mossbook.deleteOne({ _id: mossbook._id });
  }
  res.redirect('/mossbook');
});

// 👯‍♀️ UPDATE members list (Creator only)
router.post('/mossbook/:id/members', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (!mossbook.owner.equals(req.session.userId)) return res.status(403).send('Forbidden');

  const usernames = req.body.members
    ? req.body.members.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  const foundUsers = await User.find({ username: { $in: usernames } });

  mossbook.members = foundUsers.map(u => u._id);
  await mossbook.save();
  res.redirect('/mossbook');
});

// 📖 VIEW a specific Mossbook Page
router.get('/mossbook/:id/page/:page', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  const page = parseInt(req.params.page);

  const isAllowed =
    mossbook.owner.equals(req.session.userId) ||
    mossbook.members.includes(req.session.userId);

  if (!isAllowed) return res.status(403).send('Forbidden');

  res.render('layout', {
    content: 'mossbookPages',
    mossbook,
    page,
    pageClass: 'mossbook-mode'
  });
});

// 💾 SAVE scrapbook page (image + journal entry)
router.post('/mossbook/:id/page/:page', isLoggedIn, upload.single('image'), async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  const page = parseInt(req.params.page);

  const isAllowed =
    mossbook.owner.equals(req.session.userId) ||
    mossbook.members.includes(req.session.userId);

  if (!isAllowed) return res.status(403).send('Forbidden');

  mossbook.pages[page] = {
    image: req.file ? req.file.path : mossbook.pages[page].image || '',
    text: req.body.text || ''
  };

  await mossbook.save();
  res.redirect(`/mossbook/${mossbook._id}/page/${page}`);
});

module.exports = router;
