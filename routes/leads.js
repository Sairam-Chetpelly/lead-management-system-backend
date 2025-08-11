const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CallLog = require('../models/CallLog');
const { authenticateToken } = require('../middleware/auth');

// GET export leads
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find({ deletedAt: null })
      .populate('sourceId', 'name')
      .populate('salesUserId', 'name')
      .populate('presalesUserId', 'name')
      .populate('leadStatusId', 'name')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 });
    
    const csvData = leads.map(lead => ({
      'Lead ID': lead.leadId || '',
      'Name': lead.name,
      'Email': lead.email,
      'Contact': lead.contactNumber,
      'Source': lead.sourceId?.name || '',
      'Status': lead.leadStatusId?.name || '',
      'Sales User': lead.salesUserId?.name || '',
      'Presales User': lead.presalesUserId?.name || '',
      'Centre': lead.centerId?.name || '',
      'Created': lead.createdAt
    }));
    
    res.json(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all leads with pagination and filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', source = '', status = '', assignedTo = '' } = req.query;
    
    const filter = { deletedAt: null };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
        { leadId: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (source) filter.sourceId = source;
    if (status) filter.leadStatusId = status;
    if (assignedTo) {
      filter.$or = [
        { salesUserId: assignedTo },
        { presalesUserId: assignedTo }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('sourceId', 'name')
        .populate('salesUserId', 'name')
        .populate('presalesUserId', 'name')
        .populate('leadStatusId', 'name')
        .populate('centerId', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Lead.countDocuments(filter)
    ]);
    
    res.json({
      data: leads,
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

// GET lead by ID
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('sourceId')
      .populate('salesUserId')
      .populate('presalesUserId')
      .populate('leadStatusId')
      .populate('centerId');
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead with activities and call logs
router.get('/:id/details', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('sourceId')
      .populate('salesUserId')
      .populate('presalesUserId')
      .populate('leadStatusId')
      .populate('centerId');
    
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const [activities, callLogs] = await Promise.all([
      LeadActivity.find({ leadId: req.params.id, deletedAt: null })
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
        .sort({ createdAt: -1 }),
      CallLog.find({ leadId: req.params.id, deletedAt: null })
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
    ]);

    res.json({
      lead,
      activities,
      callLogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new lead
router.post('/', authenticateToken, async (req, res) => {
  try {
    const lead = new Lead(req.body);
    const savedLead = await lead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// PUT update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE lead (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;