// 📁 routes/shadow.js
const express = require('express');
const router = express.Router();
const Shadow = require('../models/Shadow');
const User = require('../models/User');

function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}
router.get('/shadowroom', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.session.userId).populate('friends');
  
    // find mutual friends
    const mutuals = user.friends.filter(friend =>
      friend.friends.includes(user._id)
    );
  
    // include YOUR OWN posts too
    const userAndMutuals = [...mutuals.map(f => f._id), user._id];
  
    const shadows = await Shadow.find({
      user: { $in: userAndMutuals }
    }).sort({ createdAt: -1 });
  

    res.render('layout', { content: 'shadowroom', shadows });
});

router.post('/shadowroom', isLoggedIn, async (req, res) => {
  try {
    const newShadow = new Shadow({
      author: req.session.userId,
      content: req.body.content
    });
    await newShadow.save();
    res.redirect('/shadowroom');
  } catch (err) {
    console.error('🔥 Posting Error:', err);
    res.status(500).send('Could not post shadow');
  }
});

router.post('/shadowroom/:id/react/:type', isLoggedIn, async (req, res) => {
  const { id, type } = req.params;
  const userId = req.session.userId;
  try {
    const shadow = await Shadow.findById(id);
    if (!shadow) return res.redirect('/shadowroom');

    if (type === 'glow' && !shadow.glowReacts.includes(userId)) {
      shadow.glowReacts.push(userId);
    } else if (type === 'mist' && !shadow.mistReacts.includes(userId)) {
      shadow.mistReacts.push(userId);
    }

    await shadow.save();
    res.redirect('/shadowroom');
  } catch (err) {
    console.error('🔥 Reaction Error:', err);
    res.status(500).send('Could not react');
  }
});

module.exports = router;