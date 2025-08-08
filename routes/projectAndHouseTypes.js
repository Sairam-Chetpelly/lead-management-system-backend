const express = require('express');
const router = express.Router();
const ProjectAndHouseType = require('../models/ProjectAndHouseType');

// GET all project and house types
router.get('/', async (req, res) => {
  try {
    const types = await ProjectAndHouseType.find({ deletedAt: null });
    res.json(types);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET project and house type by ID
router.get('/:id', async (req, res) => {
  try {
    const type = await ProjectAndHouseType.findById(req.params.id);
    if (!type || type.deletedAt) {
      return res.status(404).json({ message: 'Type not found' });
    }
    res.json(type);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new project and house type
router.post('/', async (req, res) => {
  try {
    const type = new ProjectAndHouseType(req.body);
    const savedType = await type.save();
    res.status(201).json(savedType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update project and house type
router.put('/:id', async (req, res) => {
  try {
    const type = await ProjectAndHouseType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!type || type.deletedAt) {
      return res.status(404).json({ message: 'Type not found' });
    }
    res.json(type);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE project and house type (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const type = await ProjectAndHouseType.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!type) {
      return res.status(404).json({ message: 'Type not found' });
    }
    res.json({ message: 'Type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;