// routes/categories.js
const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// List categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().populate('parent').sort({ createdAt: -1 });
    res.render('categories', { categories, messages: req.flash() });
  } catch (err) {
    console.error('GET /categories error:', err);
    res.status(500).send('Server Error');
  }
});

// Add form
router.get('/add', async (req, res) => {
  try {
    const parents = await Category.find().sort({ name: 1 });
    res.render('category_add', { parents, messages: req.flash() });
  } catch (err) {
    console.error('GET /categories/add error:', err);
    res.status(500).send('Server Error');
  }
});

// Add POST
router.post('/add', async (req, res) => {
  try {
    const { name, description, parent, status } = req.body;
    const cat = new Category({
      name: name.trim(),
      description: description || '',
      parent: parent || null,
      status: status || 'Active'
    });
    await cat.save();
    req.flash('info', 'Category added successfully');
    res.redirect('/categories');
  } catch (err) {
    console.error('POST /categories/add error:', err);
    if (err.code === 11000) req.flash('error', 'Category name already exists');
    else req.flash('error', 'Failed to add category');
    res.redirect('/categories/add');
  }
});

// Edit form
router.get('/edit/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      req.flash('error', 'Category not found');
      return res.redirect('/categories');
    }
    const parents = await Category.find({ _id: { $ne: req.params.id } }).sort({ name: 1 });
    res.render('category_edit', { category, parents, messages: req.flash() });
  } catch (err) {
    console.error('GET /categories/edit error:', err);
    res.status(500).send('Server Error');
  }
});

// Edit POST
router.post('/edit/:id', async (req, res) => {
  try {
    const { name, description, parent, status } = req.body;
    await Category.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      description: description || '',
      parent: parent || null,
      status: status || 'Active'
    });
    req.flash('info', 'Category updated successfully');
    res.redirect('/categories');
  } catch (err) {
    console.error('POST /categories/edit error:', err);
    if (err.code === 11000) req.flash('error', 'Category name already exists');
    else req.flash('error', 'Failed to update category');
    res.redirect(`/categories/edit/${req.params.id}`);
  }
});

// Delete confirm page
router.get('/delete/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      req.flash('error', 'Category not found');
      return res.redirect('/categories');
    }
    res.render('category_delete', { category, messages: req.flash() });
  } catch (err) {
    console.error('GET /categories/delete error:', err);
    res.status(500).send('Server Error');
  }
});

// Delete POST
router.post('/delete/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    req.flash('info', 'Category deleted successfully');
    res.redirect('/categories');
  } catch (err) {
    console.error('POST /categories/delete error:', err);
    req.flash('error', 'Failed to delete category');
    res.redirect('/categories');
  }
});

module.exports = router;
