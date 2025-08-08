const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CallLog = require('../models/CallLog');
const { authenticateToken } = require('../middleware/auth');

// GET all leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find({ deletedAt: null })
      .populate('sourceId', 'name')
      .populate('salesUserId', 'name')
      .populate('presalesUserId', 'name')
      .populate('leadStatusId', 'name')
      .populate('centerId', 'name');
    res.json(leads);
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
    
    // Create initial lead activity
    const leadActivity = new LeadActivity({
      leadId: savedLead._id,
      name: savedLead.name,
      email: savedLead.email,
      contactNumber: savedLead.contactNumber,
      sourceId: savedLead.sourceId,
      presalesUserId: savedLead.presalesUserId,
      salesUserId: savedLead.salesUserId,
      leadStatusId: savedLead.leadStatusId,
      centerId: savedLead.centerId,
      updatedPerson: req.user.userId
    });
    await leadActivity.save();
    
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
    
    // Create lead activity for the update
    const leadActivity = new LeadActivity({
      leadId: lead._id,
      name: lead.name,
      email: lead.email,
      contactNumber: lead.contactNumber,
      sourceId: lead.sourceId,
      presalesUserId: lead.presalesUserId,
      salesUserId: lead.salesUserId,
      leadStatusId: lead.leadStatusId,
      centerId: lead.centerId,
      updatedPerson: req.user.userId,
      notes: 'Lead information updated'
    });
    await leadActivity.save();
    
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