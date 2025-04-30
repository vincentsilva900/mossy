const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function isLoggedIn(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

// 💌 Inbox View (List All Friends with Start Chat Option)
router.get('/', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.session.userId).populate('friends');

  const messages = await Message.find({
    $or: [{ sender: user._id }, { receiver: user._id }]
  }).populate('sender receiver');

  const latestMessagesMap = {};

  messages.reverse().forEach(msg => {
    const otherUser = msg.sender._id.equals(user._id) ? msg.receiver : msg.sender;
    latestMessagesMap[otherUser._id.toString()] = msg;
  });

  const friendsList = user.friends.map(friend => ({
    friend,
    latestMessage: latestMessagesMap[friend._id.toString()] || null
  }));

  res.render('layout', { content: 'inbox', conversations: friendsList });
});


// 🧚‍♀️ Chat with a Specific Friend
router.get('/:friendId', isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  const friendId = req.params.friendId;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId }
    ]
  }).sort({ createdAt: 1 }).populate('sender receiver');

  const friend = await User.findById(friendId);

  if (!friend) {
    return res.send("🚫 Friend not found.");
  }

  res.render('layout', {
    content: 'chat',
    messages,
    friend
  });
});


router.post('/:friendId', isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  const friendId = req.params.friendId;

  let imageUrl = '';
  let videoUrl = '';

  if (req.files?.image) {
    const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
      folder: 'mossy_chat_images'
    });
    imageUrl = result.secure_url;
  }

  if (req.files?.video) {
    const result = await cloudinary.uploader.upload(req.files.video.tempFilePath, {
      resource_type: 'video',
      folder: 'mossy_chat_videos'
    });
    videoUrl = result.secure_url;
  }

  await Message.create({
    sender: userId,
    receiver: friendId,
    content: req.body.content,
    image: imageUrl,
    video: videoUrl
  });

  res.redirect(`/messages/${friendId}`);
});

// 🗑 Delete Your Own Message
router.post('/delete/:messageId', isLoggedIn, async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).send("Message not found");
  if (!message.sender.equals(req.session.userId)) return res.status(403).send("Unauthorized");

  const receiverId = message.receiver;
  await Message.findByIdAndDelete(req.params.messageId);
  res.redirect(`/messages/${receiverId}`);
});
router.post('/delete-conversation/:friendId', isLoggedIn, async (req, res) => {
  const userId = req.session.userId;
  const friendId = req.params.friendId;

  await Message.deleteMany({
    $or: [
      { sender: userId, receiver: friendId },
      { sender: friendId, receiver: userId }
    ]
  });

  res.redirect('/messages');
});
router.post('/start', isLoggedIn, async (req, res) => {
  const currentUserId = req.session.userId;
  const { username } = req.body;

  try {
    const friendUser = await User.findOne({ username });

    if (!friendUser) {
      return res.send("🚫 No user with that username.");
    }

    const currentUser = await User.findById(currentUserId);

    // Check if they're friends
    if (!currentUser.friends.includes(friendUser._id)) {
      return res.send("🚫 That user is not your friend.");
    }

    // ✅ Redirect to chat page
    return res.redirect(`/messages/${friendUser._id}`);
  } catch (err) {
    console.error("Start chat error:", err);
    res.status(500).send("Internal Server Error");
  }
});




module.exports = router;

