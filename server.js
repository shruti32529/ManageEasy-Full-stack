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

// Wrap res.render
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

// simple pages
app.get('/', (req, res) => {
  res.redirect('/login');
});

// small health-check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ------------------- USER AND GROUP MANAGEMENT -------------------
const Group = require('./models/UserGroup');
const User = require('./models/User');

// Manage Users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.render('users', { users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Manage Groups
app.get('/users/groups', async (req, res) => {
  try {
    const groups = await Group.find({});
    res.render('user_groups', { groups, messages: req.flash() });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add group form
app.get('/users/groups/add', (req, res) => {
  res.render('user_group_add', { messages: req.flash() });
});

// Add group POST
app.post('/users/groups/add', async (req, res) => {
  let { groupName, groupLevel, status } = req.body;
  groupLevel = Number(groupLevel);

  if (!groupName || !groupLevel || !status || isNaN(groupLevel)) {
    req.flash('error', 'Please fill all required fields.');
    return res.redirect('/users/groups/add');
  }
  try {
    const newGroup = new Group({ groupName, groupLevel, status });
    await newGroup.save();
    req.flash('info', 'Group added successfully!');
    res.redirect('/users/groups');
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      req.flash('error', 'Group name already exists.');
    } else {
      req.flash('error', 'Failed to add group.');
    }
    res.redirect('/users/groups/add');
  }
});

// Edit group form
app.get('/users/groups/edit/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error', 'Group not found.');
      return res.redirect('/users/groups');
    }
    res.render('user_groups_edit', { group, messages: req.flash() });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching group for edit.');
    res.redirect('/users/groups');
  }
});

// Edit group POST
app.post('/users/groups/edit/:id', async (req, res) => {
  try {
    const { groupName, groupLevel, status } = req.body;
    await Group.findByIdAndUpdate(req.params.id, { groupName, groupLevel, status });
    req.flash('info', 'Group updated successfully!');
    res.redirect('/users/groups');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update group.');
    res.redirect(`/users/groups/edit/${req.params.id}`);
  }
});

// Delete group confirm
app.get('/users/groups/delete/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      req.flash('error', 'Group not found.');
      return res.redirect('/users/groups');
    }
    res.render('user_group_delete', { group, messages: req.flash() });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error fetching group for deletion.');
    res.redirect('/users/groups');
  }
});

// Delete group POST
app.post('/users/groups/delete/:id', async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    req.flash('info', 'Group deleted successfully!');
    res.redirect('/users/groups');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete group.');
    res.redirect('/users/groups');
  }
});

// ------------------- ERROR HANDLING -------------------
// Error handling middleware
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


