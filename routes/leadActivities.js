const express = require('express');
const router = express.Router();
const LeadActivity = require('../models/LeadActivity');

// GET export lead activities
router.get('/export', async (req, res) => {
  try {
    const leadActivities = await LeadActivity.find({ deletedAt: null })
      .populate('leadId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('leadStatusId', 'name')
      .populate('sourceId', 'name')
      .sort({ createdAt: -1 });
    
    const csvData = leadActivities.map(activity => ({
      'Lead': activity.leadId?.name || '',
      'Name': activity.name || '',
      'Email': activity.email || '',
      'Contact': activity.contactNumber || '',
      'Lead Value': activity.leadValue || '',
      'Payment Method': activity.paymentMethod || '',
      'Site Visit': activity.siteVisit ? 'Yes' : 'No',
      'Center Visit': activity.centerVisit ? 'Yes' : 'No',
      'Virtual Meeting': activity.virtualMeeting ? 'Yes' : 'No',
      'Completed': activity.isCompleted ? 'Yes' : 'No',
      'Created': activity.createdAt
    }));
    
    res.json(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all lead activities with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', leadValue = '', isCompleted = '' } = req.query;
    
    const filter = { deletedAt: null };
    
    if (leadValue) filter.leadValue = leadValue;
    if (isCompleted !== '') filter.isCompleted = isCompleted === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leadActivities, total] = await Promise.all([
      LeadActivity.find(filter)
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
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      LeadActivity.countDocuments(filter)
    ]);
    
    // Apply search filter after population
    let filteredActivities = leadActivities;
    if (search) {
      filteredActivities = leadActivities.filter(activity => 
        (activity.name && activity.name.toLowerCase().includes(search.toLowerCase())) ||
        (activity.email && activity.email.toLowerCase().includes(search.toLowerCase())) ||
        (activity.contactNumber && activity.contactNumber.includes(search)) ||
        (activity.leadId?.name && activity.leadId.name.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    res.json({
      data: filteredActivities,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
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
router.post('/', async (req, res) => {
  try {
    // Clean empty strings and null values
    const cleanData = { ...req.body };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === '' || cleanData[key] === null || cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    const leadActivity = new LeadActivity(cleanData);
    const savedLeadActivity = await leadActivity.save();
    
    const populatedActivity = await LeadActivity.findById(savedLeadActivity._id)
      .populate('updatedPerson', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('leadStatusId', 'name')
      .populate('languageId', 'name')
      .populate('sourceId', 'name')
      .populate('centerId', 'name');
    
    res.status(201).json(populatedActivity);
  } catch (error) {
    console.error('Lead activity creation error:', error);
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