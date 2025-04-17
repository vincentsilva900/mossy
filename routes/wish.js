const express = require('express');
const router = express.Router();
const Wish = require('../models/Wish');
const User = require('../models/User');

// Middleware: must be logged in
function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// CREATE Wish
router.post('/wish', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId);
  const wish = new Wish({
    user: user._id,
    content: req.body.content,
  });
  await wish.save();
  res.redirect('/wishes');
});

// WATER a wish (add time)
router.post('/wish/:id/water', isLoggedIn, async (req, res) => {
  const wish = await Wish.findById(req.params.id);
  if (!wish.water.includes(req.session.userId)) {
    wish.water.push(req.session.userId);
    // Each water adds 2 hours (customize as you wish!)
    wish.expiresAt = new Date(wish.expiresAt.getTime() + 2 * 60 * 60 * 1000);
    await wish.save();
  }
  res.redirect('/wishes');
});

// SHOW all active wishes (friends + your own)
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
      console.error('🔥 Wish Error:', err);
      res.status(500).send('Could not load wishes');
    }
  });
  
  

// AUTO-DELETE expired wishes (optional: use a scheduled job IRL)
// You can also add a cron job or, for dev, just do it in a GET route:
router.get('/wishes/cleanup', async (req, res) => {
  await Wish.deleteMany({ expiresAt: { $lte: new Date() } });
  res.send('Cleaned up old wishes!');
});

module.exports = router;
