const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// GET chat with a specific friend
router.get('/:friendId', async (req, res) => {
  const userId = req.session.userId;
  const friendId = req.params.friendId;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId }
    ]
  }).sort({ createdAt: 1 }).populate('sender receiver');

  const friend = await User.findById(friendId);
  res.render('chat', { messages, friend });
});

// POST send a message
router.post('/:friendId', async (req, res) => {
  const userId = req.session.userId;
  const friendId = req.params.friendId;

  await Message.create({
    sender: userId,
    receiver: friendId,
    content: req.body.content
  });

  res.redirect(`/messages/${friendId}`);
});

module.exports = router;
