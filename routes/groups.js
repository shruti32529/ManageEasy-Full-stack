const express = require("express");
const router = express.Router();
const Group = require("../models/UserGroup");

// Show all groups
router.get("/", async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.render("groups", { groups, messages: req.flash() });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load groups.");
    res.redirect("/");
  }
});

// Show add group form
router.get("/add", (req, res) => {
  res.render("addGroup", { messages: req.flash() });
});

// Handle add group
router.post("/add", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      req.flash("error", "Group name is required.");
      return res.redirect("/groups/add");
    }

    await Group.create({ name, description });
    req.flash("success", "Group added successfully!");
    res.redirect("/groups");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to add group. Maybe name already exists?");
    res.redirect("/groups/add");
  }
});

module.exports = router;
