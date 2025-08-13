const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { authenticateToken } = require('../middleware/auth');

// GET all leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', source = '', status = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};
    
    // Role-based filtering
    const Status = require('../models/Status');
    const [leadStatus, qualifiedStatus, lostStatus] = await Promise.all([
      Status.findOne({ slug: 'lead', type: 'leadStatus' }),
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' })
    ]);
    
    if (req.user.role === 'presales_agent') {
      // Presales agents see leads assigned to them that are not lost and not qualified
      filter.presalesUserId = req.user.userId;
      filter.leadStatusId = { $nin: [qualifiedStatus._id, lostStatus._id] };
    } else if (req.user.role === 'sales_agent') {
      // Sales agents only see qualified leads assigned to them
      filter.salesUserId = req.user.userId;
      filter.leadStatusId = qualifiedStatus._id;
    } else if (req.user.role === 'manager_presales' || req.user.role === 'hod_presales') {
      // Presales managers see all leads with presales team
      filter.$or = [
        { leadStatusId: leadStatus._id },
        { presalesUserId: { $exists: true, $ne: null } }
      ];
    } else if (req.user.role === 'sales_manager') {
      // Sales managers see qualified leads in their center
      filter.leadStatusId = qualifiedStatus._id;
      if (req.user.fullUser.centreId) {
        filter.centerId = req.user.fullUser.centreId;
      }
    } else if (req.user.role === 'hod_sales') {
      // HOD Sales sees all qualified leads
      filter.leadStatusId = qualifiedStatus._id;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (source) filter.sourceId = source;
    if (status && (req.user.role === 'admin' || req.user.role === 'manager_presales' || req.user.role === 'hod_presales')) {
      filter.leadStatusId = status;
    }

    const leads = await Lead.find(filter)
      .populate('sourceId', 'name')
      .populate('leadStatusId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('languageId', 'name')
      .populate('centerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: leads,
      pagination: {
        current: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('sourceId', 'name')
      .populate('leadStatusId', 'name')
      .populate('presalesUserId', 'name')
      .populate('salesUserId', 'name')
      .populate('languageId', 'name')
      .populate('centerId', 'name');
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead details with call logs and activities
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    const CallLog = require('../models/CallLog');
    const LeadActivity = require('../models/LeadActivity');
    
    const [lead, callLogs, activities] = await Promise.all([
      Lead.findById(req.params.id)
        .populate('sourceId', 'name')
        .populate('leadStatusId', 'name')
        .populate('presalesUserId', 'name')
        .populate('salesUserId', 'name')
        .populate('languageId', 'name')
        .populate('centerId', 'name'),
      CallLog.find({ leadId: req.params.id, deletedAt: null })
        .populate('userId', 'name')
        .sort({ callDateTime: -1 }),
      LeadActivity.find({ leadId: req.params.id, deletedAt: null })
        .populate('updatedPerson', 'name')
        .populate('presalesUserId', 'name')
        .populate('salesUserId', 'name')
        .populate('leadStatusId', 'name')
        .populate('languageId', 'name')
        .populate('sourceId', 'name')
        .populate('centerId', 'name')
        .sort({ createdAt: -1 })
    ]);
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.json({
      lead,
      callLogs,
      activities
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new lead
router.post('/', authenticateToken, async (req, res) => {
  try {
    const leadData = { ...req.body };
    
    // Clean empty strings
    if (leadData.assignmentType === '') delete leadData.assignmentType;
    if (leadData.presalesUserId === '') delete leadData.presalesUserId;
    if (leadData.salesUserId === '') delete leadData.salesUserId;
    if (leadData.leadSubstatus === '') delete leadData.leadSubstatus;
    if (leadData.cifDateTime === '') delete leadData.cifDateTime;
    
    // Auto-assignment logic
    if (leadData.assignmentType === 'auto') {
      const User = require('../models/User');
      const Role = require('../models/Role');
      
      if (leadData.leadSubstatus === 'hot' || leadData.leadSubstatus === 'warm') {
        // Auto-assign sales user with sales_agent role (round-robin)
        const salesRole = await Role.findOne({ slug: 'sales_agent' });
        if (salesRole) {
          const salesUsers = await User.find({ 
            roleId: salesRole._id,
            statusId: { $exists: true }
          });
          if (salesUsers.length > 0) {
            const leadCount = await Lead.countDocuments();
            const userIndex = leadCount % salesUsers.length;
            leadData.salesUserId = salesUsers[userIndex]._id;
          }
        }
      } else {
        // Auto-assign presales user with presales_agent role (round-robin)
        const presalesRole = await Role.findOne({ slug: 'presales_agent' });
        if (presalesRole) {
          const presalesUsers = await User.find({ 
            roleId: presalesRole._id,
            statusId: { $exists: true }
          });
          if (presalesUsers.length > 0) {
            const leadCount = await Lead.countDocuments();
            const userIndex = leadCount % presalesUsers.length;
            leadData.presalesUserId = presalesUsers[userIndex]._id;
          }
        }
      }
    }
    
    const lead = new Lead(leadData);
    const savedLead = await lead.save();
    res.status(201).json(savedLead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update lead
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const leadData = { ...req.body };
    
    // Clean empty strings
    if (leadData.assignmentType === '') delete leadData.assignmentType;
    if (leadData.presalesUserId === '') delete leadData.presalesUserId;
    if (leadData.salesUserId === '') delete leadData.salesUserId;
    if (leadData.leadSubstatus === '') delete leadData.leadSubstatus;
    if (leadData.cifDateTime === '') delete leadData.cifDateTime;
    
    // Handle qualification workflow
    const Status = require('../models/Status');
    const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
    
    // Check if this is a qualification update (from call log)
    if (leadData.leadValue && leadData.centerId && leadData.languageId) {
      // This is a qualification - update lead status to qualified
      leadData.leadStatusId = qualifiedStatus._id;
      leadData.leadSubstatus = 'hot';
      leadData.isQualified = true;
      
      // Auto-assign to sales agent when qualified
      const User = require('../models/User');
      const Role = require('../models/Role');
      
      const salesRole = await Role.findOne({ slug: 'sales_agent' });
      if (salesRole) {
        const salesUsers = await User.find({ 
          roleId: salesRole._id,
          'statusId': { $exists: true }
        }).populate('statusId');
        
        const activeSalesUsers = salesUsers.filter(user => user.statusId.slug === 'active');
        if (activeSalesUsers.length > 0) {
          const leadCount = await Lead.countDocuments({ salesUserId: { $exists: true } });
          const userIndex = leadCount % activeSalesUsers.length;
          leadData.salesUserId = activeSalesUsers[userIndex]._id;
          // Remove presales assignment when qualified
          leadData.presalesUserId = null;
        }
      }
    }
    
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      leadData,
      { new: true, runValidators: true }
    );
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE lead
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;