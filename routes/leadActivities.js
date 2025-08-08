const express = require('express');
const router = express.Router();
const LeadActivity = require('../models/LeadActivity');
const { authenticateToken } = require('../middleware/auth');

// GET all lead activities
router.get('/', async (req, res) => {
  try {
    const leadActivities = await LeadActivity.find({ deletedAt: null })
      .populate('leadId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('updatedPerson', 'name')
      .populate('leadStatusId', 'name')
      .populate('leadSubStatusId', 'name')
      .populate('languageId', 'name')
      .populate('sourceId', 'name')
      .populate('projectTypeId', 'name')
      .populate('houseTypeId', 'name')
      .populate('centerId', 'name');
    res.json(leadActivities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead activities by lead ID
router.get('/lead/:leadId', async (req, res) => {
  try {
    const leadActivities = await LeadActivity.find({ 
      leadId: req.params.leadId, 
      deletedAt: null 
    })
      .populate('leadId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('updatedPerson', 'name')
      .populate('leadStatusId', 'name')
      .populate('leadSubStatusId', 'name')
      .populate('languageId', 'name')
      .populate('sourceId', 'name')
      .populate('projectTypeId', 'name')
      .populate('houseTypeId', 'name')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 });
    res.json(leadActivities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET latest lead activity by lead ID
router.get('/lead/:leadId/latest', async (req, res) => {
  try {
    const latestActivity = await LeadActivity.findOne({ 
      leadId: req.params.leadId, 
      deletedAt: null 
    })
      .populate('leadId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('updatedPerson', 'name')
      .populate('leadStatusId', 'name')
      .populate('leadSubStatusId', 'name')
      .populate('languageId', 'name')
      .populate('sourceId', 'name')
      .populate('projectTypeId', 'name')
      .populate('houseTypeId', 'name')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 });
    res.json(latestActivity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead activity by ID
router.get('/:id', async (req, res) => {
  try {
    const leadActivity = await LeadActivity.findById(req.params.id)
      .populate('leadId')
      .populate('presalesUserId')
      .populate('salesUserId')
      .populate('sourceId')
      .populate('projectTypeId')
      .populate('houseTypeId');
    if (!leadActivity || leadActivity.deletedAt) {
      return res.status(404).json({ message: 'Lead activity not found' });
    }
    res.json(leadActivity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new lead activity
router.post('/', authenticateToken, async (req, res) => {
  try {
    const leadActivityData = {
      ...req.body,
      updatedPerson: req.user.userId
    };
    
    // Convert empty strings to null for ObjectId fields
    const objectIdFields = ['presalesUserId', 'salesUserId', 'leadSubStatusId', 'languageId', 'projectTypeId', 'houseTypeId', 'centerId'];
    objectIdFields.forEach(field => {
      if (leadActivityData[field] === '') {
        leadActivityData[field] = null;
      }
    });
    
    const leadActivity = new LeadActivity(leadActivityData);
    const savedLeadActivity = await leadActivity.save();
    
    // Update lead with matching fields
    const Lead = require('../models/Lead');
    const updateData = {};
    if (leadActivityData.name) updateData.name = leadActivityData.name;
    if (leadActivityData.email) updateData.email = leadActivityData.email;
    if (leadActivityData.contactNumber) updateData.contactNumber = leadActivityData.contactNumber;
    if (leadActivityData.presalesUserId) updateData.presalesUserId = leadActivityData.presalesUserId;
    if (leadActivityData.salesUserId) updateData.salesUserId = leadActivityData.salesUserId;
    if (leadActivityData.leadStatusId) updateData.leadStatusId = leadActivityData.leadStatusId;
    if (leadActivityData.sourceId) updateData.sourceId = leadActivityData.sourceId;
    if (leadActivityData.centerId) updateData.centerId = leadActivityData.centerId;
    
    await Lead.findByIdAndUpdate(leadActivityData.leadId, updateData);
    
    res.status(201).json(savedLeadActivity);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update lead activity
router.put('/:id', async (req, res) => {
  try {
    const leadActivity = await LeadActivity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!leadActivity || leadActivity.deletedAt) {
      return res.status(404).json({ message: 'Lead activity not found' });
    }
    res.json(leadActivity);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE lead activity (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const leadActivity = await LeadActivity.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!leadActivity) {
      return res.status(404).json({ message: 'Lead activity not found' });
    }
    res.json({ message: 'Lead activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;