const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CallLog = require('../models/CallLog');
const LeadWorkflowService = require('../services/leadWorkflowService');
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

// POST create new lead with workflow
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { assignmentType = 'manual_upload', ...leadData } = req.body;
    const lead = await LeadWorkflowService.createAndAssignLead(
      leadData, 
      assignmentType, 
      req.user.userId
    );
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST workflow: Language evaluation
router.post('/:id/evaluate-language', authenticateToken, async (req, res) => {
  try {
    const { isComfortable, languageId, centerId, leadValue } = req.body;
    const result = await LeadWorkflowService.evaluateLanguageComfort(
      req.params.id,
      isComfortable,
      languageId,
      centerId,
      leadValue,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST workflow: Qualify lead
router.post('/:id/qualify', authenticateToken, async (req, res) => {
  try {
    const { isQualified } = req.body;
    const result = await LeadWorkflowService.qualifyLead(
      req.params.id,
      isQualified,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST workflow: Site visit
router.post('/:id/site-visit', authenticateToken, async (req, res) => {
  try {
    const { siteVisit, siteVisitDate } = req.body;
    await LeadWorkflowService.processSiteVisit(
      req.params.id,
      siteVisit,
      siteVisitDate,
      req.user.userId
    );
    res.json({ message: 'Site visit updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST workflow: Selection centre
router.post('/:id/selection-centre', authenticateToken, async (req, res) => {
  try {
    const { centerVisit, centerVisitDate, virtualMeeting, virtualMeetingDate } = req.body;
    await LeadWorkflowService.processSelectionCentre(
      req.params.id,
      centerVisit,
      centerVisitDate,
      virtualMeeting,
      virtualMeetingDate,
      req.user.userId
    );
    res.json({ message: 'Selection centre updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST workflow: Final outcome
router.post('/:id/outcome', authenticateToken, async (req, res) => {
  try {
    const { outcome } = req.body;
    await LeadWorkflowService.processFinalOutcome(
      req.params.id,
      outcome,
      req.user.userId
    );
    res.json({ message: 'Lead outcome updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET workflow status
router.get('/:id/workflow', authenticateToken, async (req, res) => {
  try {
    const result = await LeadWorkflowService.getWorkflowStatus(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    await LeadWorkflowService.createActivity(
      lead._id,
      req.user.userId,
      'Lead information updated'
    );
    
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