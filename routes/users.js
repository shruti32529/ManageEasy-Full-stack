const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ✅ Create user
router.post('/', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = new User({
      name,
      email,
      role: role || 'staff',
      password: 'default123' // 👈 auto password
    });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add user' });
  }
});

// ✅ Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ✅ Delete user
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
