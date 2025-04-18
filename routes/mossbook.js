const express = require('express');
const router = express.Router();
const Mossbook = require('../models/Mossbook');
const User = require('../models/User');
const { storage } = require('../utils/cloudinary');
const isLoggedIn = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// GET all your Mossbooks
router.get('/mossbook', isLoggedIn, async (req, res) => {
    try {
      const mossbooks = await Mossbook.find({
        $or: [
          { owner: req.session.userId },
          { members: req.session.userId }
        ]
      });
  
      res.render('layout', {
        content: 'mossbookCover',
        mossbooks,
        pageClass: 'mossbook-mode'
      });
  
    } catch (err) {
      console.error('🔥 Mossbook Route Error:', err);
      res.status(500).send('Could not load Mossbooks');
    }
  });
  
// CREATE a new Mossbook
router.post('/mossbook', isLoggedIn, async (req, res) => {
    const newMossbook = new Mossbook({
      title: req.body.title,
      owner: req.session.userId,
      members: [],
      pages: Array(25).fill({})
    });
    await newMossbook.save();
    res.redirect(`/mossbook/${newMossbook._id}/page/0`); // ✅ GO STRAIGHT INTO PAGE 1
  });
  
// GET Mossbook cover
router.get('/mossbook/:id/cover', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (!mossbook) return res.status(404).send('Not found');
  res.render('layout', { content: 'mossbookCover', mossbook,
    pageClass: 'mossbook-mode' });
});

// POST cover title & image
router.post('/mossbook/:id/cover', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  if (mossbook.owner.equals(req.session.userId)) {
    mossbook.title = req.body.title;
    mossbook.coverImage = req.body.coverImage;
    await mossbook.save();
  }
  res.redirect(`/mossbook/${mossbook._id}/cover`);
});

// VIEW a specific page
router.get('/mossbook/:id/page/:page', isLoggedIn, async (req, res) => {
  const mossbook = await Mossbook.findById(req.params.id);
  const page = parseInt(req.params.page);
  if (!mossbook) return res.status(404).send('Not found');
  if (!mossbook.owner.equals(req.session.userId) && !mossbook.members.includes(req.session.userId)) {
    return res.status(403).send('No access');
  }
  res.render('layout', {
    content: 'mossbookPages',
    mossbook,
    page,
    pageClass: 'mossbook-mode'
  });
  
});

// SAVE a page
router.post('/mossbook/:id/page/:page', isLoggedIn, upload.single('imageUpload'), async (req, res) => {
    const mossbook = await Mossbook.findById(req.params.id);
    const page = parseInt(req.params.page);
  
    if (!mossbook.owner.equals(req.session.userId) && !mossbook.members.includes(req.session.userId)) {
      return res.status(403).send('No access');
    }
  
    // ✅ Preserve existing image unless new one uploaded
    const currentPage = mossbook.pages[page] || {};
    mossbook.pages[page] = {
      image: req.file ? req.file.path : currentPage.image || '',
      text: req.body.text || ''
    };
  
    await mossbook.save();
    res.redirect(`/mossbook/${mossbook._id}/page/${page}`);
  });
  

module.exports = router;
