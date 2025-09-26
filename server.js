const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const dotenv = require('dotenv');
dotenv.config();

require('./config/db')();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const purchaseRoutes = require('./routes/purchases');
const salesRoutes = require('./routes/sales');
const categoriesRoutes = require('./routes/categories');
const groupRoutes = require('./routes/groups'); // ✅ move import here

const { attachUserToView } = require('./middleware/auth');

const app = express();

// Ensure ejs-mate is available
let ejsMate;
try {
  ejsMate = require('ejs-mate');
  app.engine('ejs', ejsMate);
} catch (err) {
  console.error('Required package "ejs-mate" is not installed.');
  console.error('Install it from your project root and restart the server:');
  console.error('  npm install ejs-mate');
  process.exit(1);
}

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboardcat',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

// Expose flash + current user
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  res.locals.currentUser = req.session.user || null;
  next();
});

// Wrap res.render safely
app.use((req, res, next) => {
  const _render = res.render;
  res.render = function (view, options, callback) {
    try {
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }
      return _render.call(this, view, options, function (err, html) {
        if (err) return next(err);
        if (typeof callback === 'function') return callback(null, html);
        res.send(html);
      });
    } catch (err) {
      return next(err);
    }
  };
  next();
});

app.use(attachUserToView);

// ------------------- ROUTES -------------------
app.get('/login', (req, res) => {
  res.render('login');
});

app.use('/', authRoutes);
app.use('/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/sales', salesRoutes);
app.use('/categories', categoriesRoutes);
app.use('/groups', groupRoutes); // ✅ now groups is properly mounted

// simple pages
app.get('/', (req, res) => {
  res.redirect('/login');
});

// small health-check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ------------------- ERROR HANDLING -------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash('error', err.message || 'Something went wrong!');
  res.status(500).redirect('back');
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { messages: req.flash() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
