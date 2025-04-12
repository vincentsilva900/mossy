require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo');

const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const Post = require('./models/Post');
const User = require('./models/User');

const app = express();
const PORT = 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error(err));

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  app.get('/test-cloudinary', async (req, res) => {
    try {
      const result = await cloudinary.api.resources({ max_results: 1 });
      res.send('✅ Cloudinary connected! Found some resources.');
    } catch (error) {
      console.error(error);
      res.status(500).send('❌ Cloudinary not connected properly.');
    }
  });
// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET, // put a strong secret in your .env
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}


const bcrypt = require('bcryptjs');

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    req.session.userId = newUser._id; // Log them in immediately
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Username already taken or error occurred.');
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.send('User not found.');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.send('Incorrect password.');
  }

  req.session.userId = user._id; // Save user to session
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Routes
app.get('/', requireLogin, async (req, res) => {
  const currentUser = await User.findById(req.session.userId).populate('friends');
  const friendUsernames = currentUser.friends.map(friend => friend.username).concat(currentUser.username);
  
  const posts = await Post.find({ username: { $in: friendUsernames } }).sort({ createdAt: -1 });
   
  res.render('index', { posts, moment, currentUser });
});

app.post('/create-post', async (req, res) => {
  const { username, content } = req.body;
  await Post.create({ username, content });
  res.redirect('/');
});

const upload = multer({ dest: 'uploads/' }); // temp local uploads folder

app.post('/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "mossy_profiles",
      crop: "fill",
      width: 400,
      height: 400
    });

    const currentUser = await User.findById(req.session.userId);
    currentUser.profilePicture = result.secure_url;
    await currentUser.save();

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to upload profile picture");
  }
});

// === Your Own Profile Page ===
app.get('/profile', requireLogin, async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  const posts = await Post.find({ username: currentUser.username }).sort({ createdAt: -1 });

  res.render('profile', { currentUser, posts, moment });
});
app.get('/profile/:username', requireLogin, async (req, res) => {
  const currentUser = await User.findById(req.session.userId)
  .populate('friends')
  .populate('friendRequests');
  const user = await User.findOne({ username: req.params.username })
  .populate('friends'); 
  if (!user) return res.status(404).send("User not found");

  const posts = await Post.find({ username: user.username }).sort({ createdAt: -1});
  const isSelf = user._id.toString() === currentUser._id.toString();

  res.render('profile', { user, posts, isSelf, currentUser });
});


// Friend Requests
app.get('/friends', requireLogin, async (req, res) => {
  const currentUser = await User.findById(req.session.userId).populate('friendRequests');
  const users = await User.find({ _id: { $ne: req.session.userId } });
  res.render('friends', { users, currentUser });
});

app.post('/send-request/:id', async (req, res) => {
  const userToAdd = await User.findById(req.params.id);

if (!userToAdd.friendRequests.includes(req.session.userId)) {
  userToAdd.friendRequests.push(req.session.userId);
  await userToAdd.save();
}

  res.redirect('/friends');
});

app.post('/accept-request/:id', async (req, res) => {
  const currentUser = await User.findById(req.session.userId);
  const newFriend = await User.findById(req.params.id);

  if (!currentUser.friends.includes(newFriend._id)) {
      currentUser.friends.push(newFriend._id);
      newFriend.friends.push(currentUser._id);
  }
  // Remove request
  currentUser.friendRequests = currentUser.friendRequests.filter(
    id => id.toString() !== newFriend._id.toString()
  );

  await currentUser.save();
  await newFriend.save();

  res.redirect('/friends');
});

// Server start
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`); });