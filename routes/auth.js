const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserGroup = require('../models/UserGroup');
const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Multer setup for avatar uploads (store in public/uploads)
const multer = require('multer');
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

// show pages (your layout/views already exist)
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// register handler
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  try {
    if (!name || !email || !password) {
      req.flash('error', 'Please fill all required fields');
      return res.redirect('/register');
    }
    const exist = await User.findOne({ email });
    if (exist) {
      req.flash('error', 'Email already registered');
      return res.redirect('/register');
    }
    const user = new User({ name, email, password, role: role || 'staff' });
    await user.save();
    req.flash('info', 'Registration successful — please login');
    return res.redirect('/login');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'Registration failed');
    return res.redirect('/register');
  }
});

// login handler
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    if (!email || !password) {
      req.flash('error', 'Provide email and password');
      return res.redirect('/login');
    }
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
    // create session user (minimal info)
    req.session.user = { id: user._id, name: user.name, email: user.email, role: user.role };

    // Redirect based on role
    if (user.role === 'admin') {
      return res.redirect('/admin');
    }
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Login failed');
    return res.redirect('/login');
  }
});

// dashboard (protected)
router.get('/dashboard', ensureAuth, (req, res) => {
  // you can query more data here (products, sales) and pass to view
  res.render('dashboard', { title: 'Dashboard', user: req.session.user });
});

// New: admin dashboard route (protected)
router.get('/admin', ensureAuth, ensureAdmin, (req, res) => {
  // You can pass metrics / queries here; for now render view with session user
  res.render('admin_dashboard', { title: 'Admin Dashboard', user: req.session.user });
});

// Profile: show edit form
router.get('/profile', ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).lean();
    return res.render('profile', { title: 'Profile', user });
  } catch (err) {
    console.error('Profile GET error:', err);
    req.flash('error', 'Unable to load profile');
    return res.redirect('/dashboard');
  }
});

// Profile: update (name, email, avatar upload)
router.post('/profile', ensureAuth, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email } = req.body || {};
    const update = { };

    if (name) update.name = name;
    if (email) update.email = email.toLowerCase();

    if (req.file) {
      // store path relative to public so static serves it: /uploads/filename
      update.avatar = `/uploads/${req.file.filename}`;
    }

    // prevent email duplication
    if (update.email) {
      const other = await User.findOne({ email: update.email, _id: { $ne: userId } });
      if (other) {
        req.flash('error', 'Email already in use by another account');
        return res.redirect('/profile');
      }
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).lean();

    // update session user minimal info
    req.session.user = { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || null };
    req.flash('info', 'Profile updated');
    return res.redirect('/profile');
  } catch (err) {
    console.error('Profile POST error:', err);
    req.flash('error', 'Failed to update profile');
    return res.redirect('/profile');
  }
});

// User Management: list users
router.get('/users', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();
    return res.render('users', { title: 'User Management', users });
  } catch (err) {
    console.error('User Management GET error:', err);
    req.flash('error', 'Unable to load user management');
    return res.redirect('/admin');
  }
});

// User Groups: list groups
router.get('/users/groups', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const groups = await UserGroup.find().lean();
    return res.render('user_groups', { title: 'User Groups', groups });
  } catch (err) {
    console.error('User Groups GET error:', err);
    req.flash('error', 'Unable to load user groups');
    return res.redirect('/admin');
  }
});

// Add User: show form
router.get('/users/add', ensureAuth, ensureAdmin, (req, res) => {
  res.render('user_add', { title: 'Add User' });
});

// Add User: post form
router.post('/users/add', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      req.flash('error', 'Please fill all required fields');
      return res.redirect('/users/add');
    }
    const exist = await User.findOne({ email });
    if (exist) {
      req.flash('error', 'Email already registered');
      return res.redirect('/users/add');
    }
    const user = new User({ name, email, password, role: role || 'staff' });
    await user.save();
    req.flash('info', 'User added successfully');
    return res.redirect('/users');
  } catch (err) {
    console.error('Add User POST error:', err);
    req.flash('error', 'Failed to add user');
    return res.redirect('/users/add');
  }
});

// Edit User: show form
router.get('/users/edit/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/users');
    }
    return res.render('user_edit', { title: 'Edit User', user });
  } catch (err) {
    console.error('Edit User GET error:', err);
    req.flash('error', 'Unable to load user');
    return res.redirect('/users');
  }
});

// Edit User: post form
router.post('/users/edit/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body || {};
    const update = { name, email, role };
    await User.findByIdAndUpdate(req.params.id, update);
    req.flash('info', 'User updated successfully');
    return res.redirect('/users');
  } catch (err) {
    console.error('Edit User POST error:', err);
    req.flash('error', 'Failed to update user');
    return res.redirect(`/users/edit/${req.params.id}`);
  }
});

// Delete User: get (confirm)
router.get('/users/delete/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/users');
    }
    return res.render('user_delete', { title: 'Delete User', user });
  } catch (err) {
    console.error('Delete User GET error:', err);
    req.flash('error', 'Unable to load user');
    return res.redirect('/users');
  }
});

// Delete User: post (delete)
router.post('/users/delete/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    req.flash('info', 'User deleted successfully');
    return res.redirect('/users');
  } catch (err) {
    console.error('Delete User POST error:', err);
    req.flash('error', 'Failed to delete user');
    return res.redirect('/users');
  }
});

// Add User Group: show form
router.get('/users/groups/add', ensureAuth, ensureAdmin, (req, res) => {
  res.render('user_group_add', { title: 'Add User Group' });
});

// Add User Group: post form
router.post('/users/groups/add', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { name, level, status } = req.body || {};
    if (!name || !level || !status) {
      req.flash('error', 'Please fill all required fields');
      return res.redirect('/users/groups/add');
    }
    const group = new UserGroup({ name, level, status });
    await group.save();
    req.flash('info', 'User group added successfully');
    return res.redirect('/users/groups');
  } catch (err) {
    console.error('Add User Group POST error:', err);
    req.flash('error', 'Failed to add user group');
    return res.redirect('/users/groups/add');
  }
});

// Edit User Group: show form
router.get('/users/groups/edit/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const group = await UserGroup.findById(req.params.id).lean();
    if (!group) {
      req.flash('error', 'User group not found');
      return res.redirect('/users/groups');
    }
    return res.render('user_group_edit', { title: 'Edit User Group', group });
  } catch (err) {
    console.error('Edit User Group GET error:', err);
    req.flash('error', 'Unable to load user group');
    return res.redirect('/users/groups');
  }
});

// Edit User Group: post form
router.post('/users/groups/edit/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const { name, level } = req.body || {};
    const update = { name, level };
    await UserGroup.findByIdAndUpdate(req.params.id, update);
    req.flash('info', 'User group updated successfully');
    return res.redirect('/users/groups');
  } catch (err) {
    console.error('Edit User Group POST error:', err);
    req.flash('error', 'Failed to update user group');
    return res.redirect(`/users/groups/edit/${req.params.id}`);
  }
});

// Delete User Group: get (confirm)
router.get('/users/groups/delete/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    const group = await UserGroup.findById(req.params.id).lean();
    if (!group) {
      req.flash('error', 'User group not found');
      return res.redirect('/users/groups');
    }
    return res.render('user_group_delete', { title: 'Delete User Group', group });
  } catch (err) {
    console.error('Delete User Group GET error:', err);
    req.flash('error', 'Unable to load user group');
    return res.redirect('/users/groups');
  }
});

// Delete User Group: post (delete)
router.post('/users/groups/delete/:id', ensureAuth, ensureAdmin, async (req, res) => {
  try {
    await UserGroup.findByIdAndDelete(req.params.id);
    req.flash('info', 'User group deleted successfully');
    return res.redirect('/users/groups');
  } catch (err) {
    console.error('Delete User Group POST error:', err);
    req.flash('error', 'Failed to delete user group');
    return res.redirect('/users/groups');
  }
});

// logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
