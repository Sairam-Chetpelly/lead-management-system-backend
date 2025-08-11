const express = require('express');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const router = express.Router();

// Get all roles
router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find({ deletedAt: null });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all statuses
router.get('/statuses', async (req, res) => {
  try {
    const statuses = await Status.find({ deletedAt: null });
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all centres
router.get('/centres', async (req, res) => {
  try {
    const centres = await Centre.find({ deletedAt: null });
    res.json(centres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;