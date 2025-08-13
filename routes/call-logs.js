const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const { authenticateToken } = require('../middleware/auth');

// GET export call logs
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const callLogs = await CallLog.find({ deletedAt: null })
      .populate('userId', 'name email')
      .populate('leadId', 'name contactNumber email leadId')
      .populate('languageId', 'name')
      .populate('originalLanguageId', 'name')
      .populate('updatedLanguageId', 'name')
      .populate('assignedUserId', 'name email')
      .populate('centerId', 'name location')
      .populate('apartmentTypeId', 'name type')
      .sort({ callDateTime: -1 });
    
    const csvData = callLogs.map(log => ({
      'Call ID': log._id,
      'User': log.userId?.name || '',
      'User Email': log.userId?.email || '',
      'Lead Name': log.leadId?.name || '',
      'Lead ID': log.leadId?.leadId || '',
      'Contact Number': log.leadId?.contactNumber || '',
      'Lead Email': log.leadId?.email || '',
      'Call Date Time': log.callDateTime ? new Date(log.callDateTime).toLocaleString() : '',
      'Call Duration (seconds)': log.callDuration || 0,
      'Call Status': log.callStatus || '',
      'Call Outcome': log.callOutcome || '',
      'Next Call Date Time': log.nextCallDateTime ? new Date(log.nextCallDateTime).toLocaleString() : '',
      'Original Language': log.originalLanguageId?.name || '',
      'Updated Language': log.updatedLanguageId?.name || '',
      'CIF Date Time': log.cifDateTime ? new Date(log.cifDateTime).toLocaleString() : '',
      'Language Preference': log.languageId?.name || '',
      'Assigned User': log.assignedUserId?.name || '',
      'Lead Value': log.leadValue || '',
      'Center': log.centerId?.name || '',
      'Apartment Type': log.apartmentTypeId?.name || '',
      'Follow Up Action': log.followUpAction || '',
      'Notes': log.notes || '',
      'Created At': new Date(log.createdAt).toLocaleString(),
      'Updated At': new Date(log.updatedAt).toLocaleString()
    }));
    
    res.json(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all call logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', user = '', lead = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { deletedAt: null };
    if (user) filter.userId = user;
    if (lead) filter.leadId = lead;

    const callLogs = await CallLog.find(filter)
      .populate('userId', 'name email roleId')
      .populate('leadId', 'name contactNumber email leadId')
      .populate('languageId', 'name')
      .populate('originalLanguageId', 'name')
      .populate('updatedLanguageId', 'name')
      .populate('assignedUserId', 'name email roleId')
      .populate('centerId', 'name location')
      .populate('apartmentTypeId', 'name type')
      .sort({ callDateTime: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await CallLog.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: callLogs,
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

// GET call logs by lead
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const callLogs = await CallLog.find({ 
      leadId: req.params.leadId,
      deletedAt: null 
    })
      .populate('userId', 'name email roleId')
      .populate('languageId', 'name')
      .populate('originalLanguageId', 'name')
      .populate('updatedLanguageId', 'name')
      .populate('assignedUserId', 'name email roleId')
      .populate('centerId', 'name location')
      .populate('apartmentTypeId', 'name type')
      .sort({ callDateTime: -1 });
    res.json(callLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new call log
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Received call log data:', req.body);
    
    // Clean empty strings and null values
    const cleanData = { ...req.body };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === '' || cleanData[key] === null || cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    const callLog = new CallLog(cleanData);
    const savedCallLog = await callLog.save();
    console.log('Saved call log:', savedCallLog);
    
    // Update Lead table with call-related fields
    const Lead = require('../models/Lead');
    const leadUpdateData = {};
    
    if (cleanData.nextCallDateTime) leadUpdateData.nextCallDateTime = cleanData.nextCallDateTime;
    if (cleanData.cifDateTime) leadUpdateData.cifDateTime = cleanData.cifDateTime;
    
    // Handle qualification workflow
    if (cleanData.callStatus === 'connected' && cleanData.callOutcome === 'qualified') {
      // This is a qualification - trigger the qualification workflow
      if (cleanData.leadValue && cleanData.centerId && cleanData.languageId) {
        const Status = require('../models/Status');
        const User = require('../models/User');
        const Role = require('../models/Role');
        
        const [qualifiedStatus, salesRole] = await Promise.all([
          Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
          Role.findOne({ slug: 'sales_agent' })
        ]);
        
        leadUpdateData.leadStatusId = qualifiedStatus._id;
        leadUpdateData.leadSubstatus = 'hot';
        leadUpdateData.isQualified = true;
        leadUpdateData.leadValue = cleanData.leadValue;
        leadUpdateData.centerId = cleanData.centerId;
        leadUpdateData.languageId = cleanData.languageId;
        
        // Auto-assign to sales agent
        if (salesRole) {
          const salesUsers = await User.find({ 
            roleId: salesRole._id,
            'statusId': { $exists: true }
          }).populate('statusId');
          
          const activeSalesUsers = salesUsers.filter(user => user.statusId.slug === 'active');
          if (activeSalesUsers.length > 0) {
            const leadCount = await Lead.countDocuments({ salesUserId: { $exists: true } });
            const userIndex = leadCount % activeSalesUsers.length;
            leadUpdateData.salesUserId = activeSalesUsers[userIndex]._id;
            // Remove presales assignment when qualified
            leadUpdateData.presalesUserId = null;
          }
        }
      }
    } else if (cleanData.callStatus === 'connected') {
      // Other connected outcomes
      if (cleanData.callOutcome === 'follow_up') {
        leadUpdateData.leadSubstatus = 'warm';
      } else if (cleanData.callOutcome === 'not_interested') {
        const Status = require('../models/Status');
        const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
        if (lostStatus) {
          leadUpdateData.leadStatusId = lostStatus._id;
        }
      } else if (cleanData.callOutcome === 'site_visit') {
        leadUpdateData.leadSubstatus = 'warm';
        if (cleanData.siteVisitDateTime) {
          leadUpdateData.nextCallDateTime = cleanData.siteVisitDateTime;
        }
      } else if (cleanData.callOutcome === 'meeting_scheduled') {
        leadUpdateData.leadSubstatus = 'warm';
        if (cleanData.meetingDateTime) {
          leadUpdateData.nextCallDateTime = cleanData.meetingDateTime;
        }
      } else if (cleanData.callOutcome === 'won') {
        const Status = require('../models/Status');
        const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
        if (wonStatus) {
          leadUpdateData.leadStatusId = wonStatus._id;
        }
      }
    }
    
    if (Object.keys(leadUpdateData).length > 0) {
      await Lead.findByIdAndUpdate(cleanData.leadId, leadUpdateData);
    }
    
    // Create LeadActivity record for tracking changes
    try {
      const LeadActivity = require('../models/LeadActivity');
      const Lead = require('../models/Lead');
      
      // Get the lead to get its sourceId
      const lead = await Lead.findById(cleanData.leadId).populate('sourceId');
      
      if (lead && lead.sourceId) {
        const activityData = {
          leadId: cleanData.leadId,
          updatedPerson: cleanData.userId,
          sourceId: lead.sourceId._id,
          notes: `Call Log: ${cleanData.callStatus} - ${cleanData.callOutcome || 'No outcome'} - Duration: ${cleanData.callDuration || 0}s`
        };
        
        // Add relevant fields that changed
        if (cleanData.languageId) activityData.languageId = cleanData.languageId;
        if (cleanData.assignedUserId) activityData.presalesUserId = cleanData.assignedUserId;
        if (cleanData.leadValue) activityData.leadValue = cleanData.leadValue;
        if (cleanData.centerId) activityData.centerId = cleanData.centerId;
        if (cleanData.apartmentTypeId) activityData.houseTypeId = cleanData.apartmentTypeId;
        
        await new LeadActivity(activityData).save();
      }
    } catch (activityError) {
      console.log('LeadActivity creation failed, but call log saved:', activityError.message);
    }
    
    const populatedCallLog = await CallLog.findById(savedCallLog._id)
      .populate('userId', 'name email roleId')
      .populate('leadId', 'name contactNumber email leadId')
      .populate('languageId', 'name')
      .populate('originalLanguageId', 'name')
      .populate('updatedLanguageId', 'name')
      .populate('assignedUserId', 'name email roleId')
      .populate('centerId', 'name location')
      .populate('apartmentTypeId', 'name type');
    
    res.status(201).json(populatedCallLog);
  } catch (error) {
    console.error('Call log creation error:', error);
    res.status(400).json({ message: error.message, details: error });
  }
});

// PUT update call log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Clean empty strings and null values
    const cleanData = { ...req.body };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === '' || cleanData[key] === null || cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      cleanData,
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email roleId')
      .populate('leadId', 'name contactNumber email leadId')
      .populate('languageId', 'name')
      .populate('originalLanguageId', 'name')
      .populate('updatedLanguageId', 'name')
      .populate('assignedUserId', 'name email roleId')
      .populate('centerId', 'name location')
      .populate('apartmentTypeId', 'name type');
    
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    
    // Update Lead table with call-related fields
    const Lead = require('../models/Lead');
    const leadUpdateData = {};
    
    if (cleanData.nextCallDateTime) leadUpdateData.nextCallDateTime = cleanData.nextCallDateTime;
    if (cleanData.cifDateTime) leadUpdateData.cifDateTime = cleanData.cifDateTime;
    if (cleanData.leadValue) leadUpdateData.leadValue = cleanData.leadValue;
    
    // Update lead substatus based on call outcome
    if (cleanData.callStatus === 'connected') {
      if (cleanData.callOutcome === 'qualified') {
        leadUpdateData.leadSubstatus = 'hot';
      } else if (cleanData.callOutcome === 'follow_up') {
        leadUpdateData.leadSubstatus = 'warm';
      }
    }
    
    if (Object.keys(leadUpdateData).length > 0) {
      await Lead.findByIdAndUpdate(callLog.leadId, leadUpdateData);
    }
    
    // Create LeadActivity record for tracking changes
    try {
      const LeadActivity = require('../models/LeadActivity');
      const Lead = require('../models/Lead');
      
      // Get the lead to get its sourceId
      const lead = await Lead.findById(callLog.leadId).populate('sourceId');
      
      if (lead && lead.sourceId) {
        const activityData = {
          leadId: callLog.leadId,
          updatedPerson: callLog.userId,
          sourceId: lead.sourceId._id,
          notes: `Call Log Updated: ${cleanData.callStatus || callLog.callStatus} - ${cleanData.callOutcome || callLog.callOutcome || 'No outcome'} - Duration: ${cleanData.callDuration || callLog.callDuration || 0}s`
        };
        
        // Add relevant fields that changed
        if (cleanData.languageId) activityData.languageId = cleanData.languageId;
        if (cleanData.assignedUserId) activityData.presalesUserId = cleanData.assignedUserId;
        if (cleanData.leadValue) activityData.leadValue = cleanData.leadValue;
        if (cleanData.centerId) activityData.centerId = cleanData.centerId;
        if (cleanData.apartmentTypeId) activityData.houseTypeId = cleanData.apartmentTypeId;
        
        await new LeadActivity(activityData).save();
      }
    } catch (activityError) {
      console.log('LeadActivity update failed, but call log updated:', activityError.message);
    }
    
    res.json(callLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE call log (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    res.json({ message: 'Call log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;