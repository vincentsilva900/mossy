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

// 🔮 VIEW all mossbooks you own or are a member of
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

// 🌱 CREATE a new mossbook
router.post('/mossbook', isLoggedIn, async (req, res) => {
  const memberIds = Array.isArray(req.body.members)
    ? req.body.members
    : req.body.members ? [req.body.members] : [];

  const newBook = new Mossbook({
    title: req.body.title,
    owner: req.session.userId,
    members: memberIds,
    pages: Array(25).fill({})
  });

  await newBook.save();
  res.redirect(`/mossbook/${newBook._id}/page/0`);
});

// 🧼 DELETE a mossbook (creator only)
router.post('/mossbook/:id/delete', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (mossbook.owner.equals(req.session.userId)) {
    await Mossbook.deleteOne({ _id: mossbook._id });
  }
  res.redirect('/mossbook');
});

// 👯‍♀️ ADD/REMOVE MEMBERS (creator only)
router.post('/mossbook/:id/members', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (!mossbook.owner.equals(req.session.userId)) return res.status(403).send('Forbidden');

  mossbook.members = Array.isArray(req.body.members)
    ? req.body.members
    : req.body.members ? [req.body.members] : [];

  await mossbook.save();
  res.redirect('/mossbook');
});

// 📖 VIEW a mossbook page
router.get('/mossbook/:id/page/:page', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  const page = parseInt(req.params.page);

  const isAllowed = mossbook.owner.equals(req.session.userId) || mossbook.members.includes(req.session.userId);
  if (!isAllowed) return res.status(403).send('Forbidden');

  res.render('layout', {
    content: 'mossbookPages',
    mossbook,
    page,
    pageClass: 'mossbook-mode'
  });
});

// 💾 SAVE a page (members & creator can do this)
router.post('/mossbook/:id/page/:page', isLoggedIn, upload.single('image'), async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  const page = parseInt(req.params.page);

  const isAllowed = mossbook.owner.equals(req.session.userId) || mossbook.members.includes(req.session.userId);
  if (!isAllowed) return res.status(403).send('Forbidden');

  const currentPage = mossbook.pages[page] || {};
  mossbook.pages[page] = {
    image: req.file ? req.file.path : currentPage.image || '',
    text: req.body.text || ''
  };

  await mossbook.save();
  res.redirect(`/mossbook/${mossbook._id}/page/${page}`);
});

module.exports = router;
