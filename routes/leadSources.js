const express = require('express');
const router = express.Router();
const LeadSource = require('../models/LeadSource');

// GET all lead sources
router.get('/', async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null });
    res.json(leadSources);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead source by ID
router.get('/:id', async (req, res) => {
  try {
    const leadSource = await LeadSource.findById(req.params.id);
    if (!leadSource || leadSource.deletedAt) {
      return res.status(404).json({ message: 'Lead source not found' });
    }
    res.json(leadSource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new lead source
router.post('/', async (req, res) => {
  try {
    const leadSource = new LeadSource(req.body);
    const savedLeadSource = await leadSource.save();
    res.status(201).json(savedLeadSource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update lead source
router.put('/:id', async (req, res) => {
  try {
    const leadSource = await LeadSource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!leadSource || leadSource.deletedAt) {
      return res.status(404).json({ message: 'Lead source not found' });
    }
    res.json(leadSource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE lead source (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const leadSource = await LeadSource.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!leadSource) {
      return res.status(404).json({ message: 'Lead source not found' });
    }
    res.json({ message: 'Lead source deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;