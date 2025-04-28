// routes/mossbeacon.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MossbeaconMessage = require('../models/MossbeaconMessage'); // Import the Message model

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

    const otherBeaconUsers = await User.find({ mossbeacon: true, _id: { $ne: userId } });

    // NEW: Separate messages
    const messagesSent = await MossbeaconMessage.find({ sender: userId }).populate('sender receiver');
    const messagesReceived = await MossbeaconMessage.find({ receiver: userId }).populate('sender receiver');

    res.render('layout', {
        content: 'mossbeaconChat', // pass mossbeaconChat.ejs into layout
        user,
        otherBeaconUsers,
        messagesSent,
        messagesReceived,
        bodyClass: 'mossbeacon-bg', // if you want custom class
        pageClass: 'mossbeacon-bg'  // to keep using mossbook styles
      });
      
  } catch (err) {
    console.error('Mossbeacon Error:', err);
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
    console.error('Send Music Link Error:', err);
    res.redirect('back');
  }
});

module.exports = router;

