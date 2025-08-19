const express = require('express');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const Language = require('../models/Language');
const LeadSource = require('../models/LeadSource');
const ProjectAndHouseType = require('../models/ProjectAndHouseType');
const CallLog = require('../models/CallLog');
const ActivityLog = require('../models/ActivityLog');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Round robin assignment tracking
let presalesRoundRobin = 0;
let salesRoundRobin = {};

// Helper function to get next presales agent
async function getNextPresalesAgent() {
  const presalesRole = await Role.findOne({ slug: 'presales_agent' });
  const activeStatus = await Status.findOne({ slug: 'active' });
  if (!presalesRole) return null;
  if (!activeStatus) return null;

  const presalesAgents = await User.find({ 
    roleId: presalesRole._id,
    statusId: activeStatus._id,
    deletedAt: null 
  });
  
  if (presalesAgents.length === 0) return null;
  
  const agent = presalesAgents[presalesRoundRobin % presalesAgents.length];
  presalesRoundRobin++;
  
  return agent;
}

// Helper function to get next sales agent
async function getNextSalesAgent(centreId, languageId) {
  const salesRole = await Role.findOne({ slug: 'sales_agent' });
  const activeStatus = await Status.findOne({ slug: 'active' });
  if (!salesRole) return null;
  if (!activeStatus) return null;

  // First try to find agent in same center with matching language
  let salesAgents = await User.find({
    roleId: salesRole._id,
    statusId: activeStatus._id,
    centreId: centreId,
    languageIds: languageId,
    deletedAt: null
  });

  // If no agent found with center and language, find any sales agent
  if (salesAgents.length === 0) {
    salesAgents = await User.find({
      roleId: salesRole._id,
      statusId: activeStatus._id,
      deletedAt: null
    });
  }

  if (salesAgents.length === 0) return null;

  // Use round robin for this center
  const centerKey = centreId ? centreId.toString() : 'default';
  if (!salesRoundRobin[centerKey]) {
    salesRoundRobin[centerKey] = 0;
  }

  const agent = salesAgents[salesRoundRobin[centerKey] % salesAgents.length];
  salesRoundRobin[centerKey]++;

  return agent;
}

// Get dropdown data for form (must be before parameterized routes)
router.get('/form/data', async (req, res) => {
  try {
    const [centres, languages, leadSources, projectTypes, houseTypes] = await Promise.all([
      Centre.find({ deletedAt: null }).select('_id name'),
      Language.find({ deletedAt: null }).select('_id name'),
      LeadSource.find({ deletedAt: null }).select('_id name'),
      ProjectAndHouseType.find({ type: 'project', deletedAt: null }).select('_id name'),
      ProjectAndHouseType.find({ type: 'house', deletedAt: null }).select('_id name')
    ]);

    res.json({
      centres,
      languages,
      leadSources,
      projectTypes,
      houseTypes,
      leadValues: [
        { value: 'high value', label: 'High Value' },
        { value: 'medium value', label: 'Medium Value' },
        { value: 'low value', label: 'Low Value' }
      ]
    });
  } catch (error) {
    console.error('Error fetching form data:', error);
    res.status(500).json({ error: 'Failed to fetch form data' });
  }
});

// Create lead
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      contactNumber,
      comment,
      assignmentType,
      centreId,
      languageId,
      projectTypeId,
      houseTypeId,
      leadValue,
      notes,
      sourceId
    } = req.body;

    // Validate required fields
    if (!email || !contactNumber || !assignmentType || !sourceId) {
      return res.status(400).json({
        error: 'Missing required fields: email, contactNumber, assignmentType, sourceId'
      });
    }

    // Create lead
    const lead = new Lead();
    await lead.save();

    // Prepare lead activity data (filter out empty strings)
    const leadActivityData = {
      leadId: lead._id,
      name,
      email,
      contactNumber,
      sourceId
    };
    
    // Only add optional fields if they have values
    if (comment) leadActivityData.comment = comment;
    if (notes) leadActivityData.notes = notes;
    if (languageId) leadActivityData.languageId = languageId;
    if (centreId) leadActivityData.centreId = centreId;
    if (projectTypeId) leadActivityData.projectTypeId = projectTypeId;
    if (houseTypeId) leadActivityData.houseTypeId = houseTypeId;
    if (leadValue) leadActivityData.leadValue = leadValue;

    // Assign user and status based on assignment type
    if (assignmentType === 'presales') {
      const presalesAgent = await getNextPresalesAgent();
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (presalesAgent) {
        leadActivityData.presalesUserId = presalesAgent._id;
      }
      if (leadStatus) {
        leadActivityData.leadStatusId = leadStatus._id;
      }
    } else if (assignmentType === 'sales') {
      const salesAgent = await getNextSalesAgent(centreId, languageId);
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      const hotSubStatus = await Status.findOne({ slug: 'hot', type: 'leadSubStatus' });
      if (salesAgent) {
        leadActivityData.salesUserId = salesAgent._id;
      }
      if (qualifiedStatus) {
        leadActivityData.leadStatusId = qualifiedStatus._id;
      }
      if (hotSubStatus) {
        leadActivityData.leadSubStatusId = hotSubStatus._id;
      }
    }

    // Create lead activity
    const leadActivity = new LeadActivity(leadActivityData);
    await leadActivity.save();

    // Populate the response
    await leadActivity.populate([
      { path: 'leadId' },
      { path: 'presalesUserId', select: 'name email' },
      { path: 'salesUserId', select: 'name email' },
      { path: 'languageId', select: 'name' },
      { path: 'sourceId', select: 'name' },
      { path: 'projectTypeId', select: 'name type' },
      { path: 'houseTypeId', select: 'name type' },
      { path: 'centreId', select: 'name' },
      { path: 'leadStatusId', select: 'name slug' },
      { path: 'leadSubStatusId', select: 'name slug' }
    ]);

    res.status(201).json({
      message: 'Lead created successfully',
      lead: leadActivity
    });

  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Get all leads with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = { deletedAt: null };
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    
    if (req.query.source) {
      filter.sourceId = req.query.source;
    }
    
    if (req.query.leadValue) {
      filter.leadValue = req.query.leadValue;
    }
    
    if (req.query.centre) {
      filter.centreId = req.query.centre;
    }
    
    if (req.query.assignedTo) {
      filter.$or = [
        { presalesUserId: req.query.assignedTo },
        { salesUserId: req.query.assignedTo }
      ];
    }
    
    if (req.query.leadStatus) {
      filter.leadStatusId = req.query.leadStatus;
    }
    
    if (req.query.leadSubStatus) {
      filter.leadSubStatusId = req.query.leadSubStatus;
    }

    const leads = await LeadActivity.find(filter)
      .populate([
        { path: 'leadId' },
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await LeadActivity.countDocuments(filter);

    res.json({
      leads,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Export leads
router.get('/export', async (req, res) => {
  try {
    const leads = await LeadActivity.find({ deletedAt: null })
      .populate([
        { path: 'leadId' },
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ])
      .sort({ createdAt: -1 });

    const csvData = leads.map(lead => ({
      'Lead ID': lead.leadId.leadID,
      'Name': lead.name || '',
      'Email': lead.email,
      'Contact Number': lead.contactNumber,
      'Source': lead.sourceId.name,
      'Centre': lead.centreId?.name || '',
      'Assigned To': lead.presalesUserId?.name || lead.salesUserId?.name || 'Unassigned',
      'Assignment Type': lead.presalesUserId ? 'Presales' : lead.salesUserId ? 'Sales' : 'None',
      'Lead Value': lead.leadValue || '',
      'Language': lead.languageId?.name || '',
      'Project Type': lead.projectTypeId?.name || '',
      'House Type': lead.houseTypeId?.name || '',
      'Comment': lead.comment || '',
      'Notes': lead.notes || '',
      'Created At': new Date(lead.createdAt).toLocaleString()
    }));

    res.json(csvData);
  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Get lead by ID
router.get('/:id', async (req, res) => {
  try {
    const lead = await LeadActivity.findById(req.params.id)
      .populate([
        { path: 'leadId' },
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ]);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create call log
router.post('/:id/call', authenticateToken, async (req, res) => {
  try {
    const callLog = new CallLog({
      userId: req.user.userId,
      leadId: req.params.id,
      dateTime: new Date()
    });
    
    await callLog.save();
    
    res.status(201).json({ message: 'Call log created successfully', callLog });
  } catch (error) {
    console.error('Error creating call log:', error);
    res.status(500).json({ error: 'Failed to create call log' });
  }
});

// Create activity log
router.post('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const { type, comment } = req.body;
    
    if (!type || !comment) {
      return res.status(400).json({ error: 'Type and comment are required' });
    }

    const activityLog = new ActivityLog({
      userId: req.user.userId,
      leadId: req.params.id,
      type,
      comment
    });

    await activityLog.save();
    res.status(201).json({ message: 'Activity logged successfully', data: activityLog });
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  try {
    const leadActivity = await LeadActivity.findById(req.params.id);
    if (!leadActivity) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Soft delete
    leadActivity.deletedAt = new Date();
    await leadActivity.save();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;