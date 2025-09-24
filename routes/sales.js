const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Get sales page
router.get('/', async (req, res, next) => {
    try {
        const sales = await Sale.find().populate('product');
        res.render('sales', { sales, messages: req.flash() });
    } catch (err) {
        next(err);
    }
});

// Get add sale form
router.get('/add', async (req, res, next) => {
    try {
        const products = await Product.find({ status: 'Active', stock: { $gt: 0 } });
        if (!products.length) {
            req.flash('error', 'No products available for sale');
            return res.redirect('/sales');
        }
        res.render('sale_add', { products, messages: req.flash() });
    } catch (err) {
        next(err);
    }
});

// Add new sale
router.post('/add', async (req, res, next) => {
    try {
        const { product, quantity, price } = req.body;
        
        // Validate inputs
        if (!product || !quantity || !price) {
            req.flash('error', 'All fields are required');
            return res.redirect('/sales/add');
        }

        // Check product exists and has stock
        const productDoc = await Product.findById(product);
        if (!productDoc) {
            req.flash('error', 'Product not found');
            return res.redirect('/sales/add');
        }
        if (productDoc.stock < quantity) {
            req.flash('error', 'Not enough stock');
            return res.redirect('/sales/add');
        }

        const total = Number(quantity) * Number(price);
        
        // Create sale and update stock in transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const newSale = new Sale({
                product,
                quantity: Number(quantity),
                price: Number(price),
                total
            });
            
            await newSale.save({ session });
            
            await Product.findByIdAndUpdate(
                product,
                { $inc: { stock: -quantity } },
                { session }
            );
            
            await session.commitTransaction();
            req.flash('success', 'Sale completed successfully');
            res.redirect('/sales');
        } catch (err) {
            await session.abortTransaction();
            req.flash('error', 'Transaction failed');
            return res.redirect('/sales/add');
        } finally {
            session.endSession();
        }
    } catch (err) {
        next(err);
    }
});

module.exports = router;
