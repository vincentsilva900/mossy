
// 📁 routes/wish.js
const express = require('express');
const router = express.Router();
const Wish = require('../models/Wish');

const User = require('../models/User');

function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

router.post('/wish', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const wish = new Wish({
      user: user._id,
      content: req.body.content
    });
    await wish.save();
    res.redirect('/wishes');
  } catch (err) {
    console.error('🔥 Error posting wish:', err);
    res.status(500).send('Could not post wish');
  }
});

router.post('/wish/:id/water', isLoggedIn, async (req, res) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish.water.includes(req.session.userId)) {
      wish.water.push(req.session.userId);
      wish.expiresAt = new Date(wish.expiresAt.getTime() + 2 * 60 * 60 * 1000);
      await wish.save();
    }
    res.redirect('/wishes');
  } catch (err) {
    console.error('🔥 Error watering wish:', err);
    res.status(500).send('Could not water wish');
  }
});

router.get('/wishes', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('friends');
    const friends = user.friends.map(f => f._id);
    const wishes = await Wish.find({
      user: { $in: [...friends, user._id] },
      expiresAt: { $gt: new Date() }
    }).populate('user').sort({ createdAt: -1 });

    res.render('layout', { content: 'wishes', wishes, session: req.session });
  } catch (err) {
    console.error('🔥 Error loading wishes page:', err);
    res.status(500).send('Could not load wishes');
  }
});

module.exports = router;
