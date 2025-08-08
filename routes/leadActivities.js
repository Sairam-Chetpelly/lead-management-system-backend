const express = require('express');
const router = express.Router();
const LeadActivity = require('../models/LeadActivity');
const { authenticateToken } = require('../middleware/auth');

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