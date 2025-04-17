require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const fileUpload = require('express-fileupload');
const path = require('path');
const app = express();



mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
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
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
app.use('/', authRoutes);
app.use('/user', userRoutes);

const wishRoutes = require('./routes/wish');
app.use('/', wishRoutes);

app.listen(3000, () => console.log('Mossy app running on port 3000'));
