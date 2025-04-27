// routes/mossbeacon.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MossbeaconMessage = require('../models/MossbeaconMessage'); // <<< ADD THIS LINE

// GET Mossbeacon Chat
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.redirect('/login');
    }

    if (!user.mossbeacon) {
      return res.redirect('/user/' + user.username);
    }

    // Find other beacon users except yourself
    const otherBeaconUsers = await User.find({ mossbeacon: true, _id: { $ne: userId } });

    res.render('mossbeaconChat', { user, otherBeaconUsers });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// POST Send Music Link
router.post('/send', async (req, res) => {
  try {
    const { receiverId, musicLink } = req.body;
    const senderId = req.session.userId;

    const newMessage = new MossbeaconMessage({
      sender: senderId,
      receiver: receiverId,
      musicLink
    });

    await newMessage.save();
    res.redirect('/mossbeacon');
  } catch (err) {
    console.error(err);
    res.redirect('back');
  }
});

module.exports = router;
