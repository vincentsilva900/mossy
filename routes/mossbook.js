const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });

const Mossbook = require('../models/Mossbook');
const User = require('../models/User');

const isLoggedIn = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// 📚 View your Mossbooks
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

// 🌱 Create a Mossbook
router.post('/mossbook', isLoggedIn, async (req, res) => {
  const usernames = req.body.members
    ? req.body.members.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  const foundUsers = await User.find({ username: { $in: usernames } });

  const newBook = new Mossbook({
    title: req.body.title,
    owner: req.session.userId,
    members: foundUsers.map(u => u._id),
    entries: []
  });

  await newBook.save();
  res.redirect(`/mossbook/${newBook._id}/page/0`);
});

// ❌ Delete Mossbook (owner only)
router.post('/mossbook/:id/delete', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (mossbook.owner.equals(req.session.userId)) {
    await Mossbook.deleteOne({ _id: mossbook._id });
  }
  res.redirect('/mossbook');
});

// 👯 Update Mossbook members
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

// 📖 View a Mossbook Page (feed-style)
router.get('/mossbook/:id/page/:page', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id).populate('entries.postedBy');
  const page = parseInt(req.params.page);

  const isAllowed = mossbook.owner.equals(req.session.userId) || mossbook.members.includes(req.session.userId);
  if (!isAllowed) return res.status(403).send('Forbidden');

  const entry = mossbook.entries[page];

  res.render('layout', {
    content: 'mossbookPageFeed',
    mossbook,
    entry,
    page,
    pageCount: mossbook.entries.length,
    pageClass: 'mossbook-mode'
  });
});

// 💾 Post a new scrapbook entry
router.post('/mossbook/:id/entry', isLoggedIn, async (req, res) => {
  try {
    const mossbook = await Mossbook.findById(req.params.id);
    const userId = req.session.userId;

    const isAllowed =
      mossbook.owner.equals(userId) ||
      mossbook.members.includes(userId);

    if (!isAllowed) return res.status(403).send('Forbidden');

    let imageUrl = '';
    if (req.files && req.files.image) {
      const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
        folder: 'mossbook_entries'
      });
      imageUrl = result.secure_url;
    }

    mossbook.entries.push({
      image: imageUrl, // empty string is fine if no upload
      text: req.body.text || '', // optional text
      postedBy: userId
    });

    await mossbook.save();
    res.redirect(`/mossbook/${mossbook._id}/page/${mossbook.entries.length - 1}`);
  } catch (err) {
    console.error('🧨 Mossbook post error:', err);
    res.status(500).send('Failed to post entry.');
  }
});



module.exports = router;

