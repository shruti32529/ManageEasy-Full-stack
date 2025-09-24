const express = require('express');
const router = express.Router();

// Only require the Group model if it hasn't been required elsewhere in this file/module
const Group = require('../models/UserGroup');

// Manage Groups Page
router.get('/groups', async (req, res) => {
    try {
        const groups = await Group.find();
        res.render('user_groups', { groups });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Add Group Form
router.get('/groups/add', (req, res) => {
    res.render('user_group_add');
});

// Add Group POST
router.post('/groups/add', async (req, res) => {
    try {
        const { groupName, groupLevel, status } = req.body;
        const newGroup = new Group({ groupName, groupLevel, status });
        await newGroup.save();
        res.redirect('/users/groups');
    } catch (err) {
        res.status(500).send('Error saving group');
    }
});

// Edit Group Form
router.get('/groups/edit/:id', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        res.render('user_group_edit', { group });
    } catch (err) {
        res.status(500).send('Error fetching group');
    }
});

// Update Group
router.post('/groups/edit/:id', async (req, res) => {
    try {
        const { groupName, groupLevel, status } = req.body;
        await Group.findByIdAndUpdate(req.params.id, { groupName, groupLevel, status });
        res.redirect('/users/groups');
    } catch (err) {
        res.status(500).send('Error updating group');
    }
});

// Delete Group
router.get('/groups/delete/:id', async (req, res) => {
    try {
        await Group.findByIdAndDelete(req.params.id);
        res.redirect('/users/groups');
    } catch (err) {
        res.status(500).send('Error deleting group');
    }
});

module.exports = router;
