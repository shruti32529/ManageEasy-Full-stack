const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');

// Manage Products (List)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category');
    res.render('products/manage_products', { products, messages: req.flash() });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load products.');
    res.redirect('/');
  }
});

// Add Product Form
router.get('/add', async (req, res) => {
  const categories = await Category.find();
  res.render('products/add_product', { categories, messages: req.flash() });
});

// Add Product POST
router.post('/add', async (req, res) => {
  try {
    const { name, category, stock, price, status } = req.body;
    const product = new Product({ name, category, stock, price, status });
    await product.save();
    req.flash('info', 'Product added successfully!');
    res.redirect('/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add product.');
    res.redirect('/products/add');
  }
});

// Edit Product Form
router.get('/edit/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find();
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/products');
    }
    res.render('products/edit_product', { product, categories, messages: req.flash() });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load product for edit.');
    res.redirect('/products');
  }
});

// Edit Product POST
router.post('/edit/:id', async (req, res) => {
  try {
    const { name, category, stock, price, status } = req.body;
    await Product.findByIdAndUpdate(req.params.id, { name, category, stock, price, status });
    req.flash('info', 'Product updated successfully!');
    res.redirect('/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update product.');
    res.redirect(`/products/edit/${req.params.id}`);
  }
});

// Delete Product Confirm Page
router.get('/delete/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/products');
    }
    res.render('products/delete_product', { product, messages: req.flash() });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load product for delete.');
    res.redirect('/products');
  }
});

// Delete Product POST
router.post('/delete/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash('info', 'Product deleted successfully!');
    res.redirect('/products');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete product.');
    res.redirect('/products');
  }
});

module.exports = router;
