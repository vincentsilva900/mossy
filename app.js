require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');

const path = require('path');
const app = express();

const fileUpload = require('express-fileupload');
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true }));


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'));

app.set('view engine', 'ejs');

app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));


app.use(session({
  secret: 'mossySecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Add session to locals so we can access session.userId in EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});


// Routes
const userRoutes = require('./routes/user');

app.use('/user', userRoutes);

const wishRoutes = require('./routes/wish');
app.use('/', wishRoutes);
const shadowRoutes = require('./routes/shadow');
app.use('/', shadowRoutes);
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);
const mossbookRoutes = require('./routes/mossbook');
app.use('/', mossbookRoutes);
const messageRoutes = require('./routes/message');
app.use('/messages', messageRoutes);

app.get('/terms', (req, res) => {
  res.render('terms');
});

app.get('/privacy', (req, res) => {
  res.render('privacy');
});


app.listen(3000, () => console.log('Mossy app running on port 3000'));
