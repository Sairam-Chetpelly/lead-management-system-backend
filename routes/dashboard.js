const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const Status = require('../models/Status');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard stats for sales agents
router.get('/sales-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'sales_agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [qualifiedStatus, wonStatus, lostStatus] = await Promise.all([
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'won', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' })
    ]);

    // Total Qualified Leads assigned to sales agent
    const totalQualifiedLeads = await Lead.countDocuments({
      salesUserId: req.user.userId,
      leadStatusId: qualifiedStatus._id
    });

    // Hot Leads (qualified-hot substatus)
    const hotLeads = await Lead.countDocuments({
      salesUserId: req.user.userId,
      leadStatusId: qualifiedStatus._id,
      leadSubstatus: 'hot'
    });

    // Warm Leads (qualified-warm substatus)
    const warmLeads = await Lead.countDocuments({
      salesUserId: req.user.userId,
      leadStatusId: qualifiedStatus._id,
      leadSubstatus: 'warm'
    });

    // CIF Leads (qualified-cif substatus)
    const cifLeads = await Lead.countDocuments({
      salesUserId: req.user.userId,
      leadStatusId: qualifiedStatus._id,
      leadSubstatus: 'cif'
    });

    // Won Leads
    const wonLeads = await Lead.countDocuments({
      salesUserId: req.user.userId,
      leadStatusId: wonStatus._id
    });

    res.json({
      totalQualifiedLeads,
      hotLeads,
      warmLeads,
      cifLeads,
      wonLeads
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales leads by category
router.get('/sales-leads/:category', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'sales_agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [qualifiedStatus, wonStatus] = await Promise.all([
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'won', type: 'leadStatus' })
    ]);

    let filter = {
      salesUserId: req.user.userId
    };

    let sortOrder = { createdAt: -1 };

    if (category === 'hot') {
      filter.leadStatusId = qualifiedStatus._id;
      filter.leadSubstatus = 'hot';
    } else if (category === 'warm') {
      filter.leadStatusId = qualifiedStatus._id;
      filter.leadSubstatus = 'warm';
      sortOrder = { nextCallDateTime: 1 };
    } else if (category === 'cif') {
      filter.leadStatusId = qualifiedStatus._id;
      filter.leadSubstatus = 'cif';
      sortOrder = { cifDateTime: 1 };
    } else if (category === 'won') {
      filter.leadStatusId = wonStatus._id;
      sortOrder = { updatedAt: -1 };
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('sourceId', 'name')
        .populate('leadStatusId', 'name')
        .populate('languageId', 'name')
        .populate('centerId', 'name')
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit)),
      Lead.countDocuments(filter)
    ]);

    res.json({
      data: leads,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats for presales agents
router.get('/presales-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'presales_agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [leadStatus, qualifiedStatus, lostStatus] = await Promise.all([
      Status.findOne({ slug: 'lead', type: 'leadStatus' }),
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' })
    ]);

    // Total Leads: not lost and not qualified and assigned to presales agent
    const totalLeads = await Lead.countDocuments({
      presalesUserId: req.user.userId,
      leadStatusId: { $nin: [qualifiedStatus._id, lostStatus._id] }
    });

    // Fresh Leads: assigned but no call history
    const freshLeadsIds = await CallLog.distinct('leadId', { 
      leadId: { $exists: true } 
    });
    const freshLeads = await Lead.countDocuments({
      presalesUserId: req.user.userId,
      leadStatusId: { $nin: [qualifiedStatus._id, lostStatus._id] },
      _id: { $nin: freshLeadsIds }
    });

    // Follow ups: leads with follow up calls scheduled
    const followUpLeadsIds = await CallLog.distinct('leadId', {
      $or: [
        { callOutcome: 'follow_up' },
        { followUpAction: 'follow_up' }
      ]
    });
    const followUpLeads = await Lead.countDocuments({
      presalesUserId: req.user.userId,
      leadStatusId: { $nin: [qualifiedStatus._id, lostStatus._id] },
      _id: { $in: followUpLeadsIds },
      nextCallDateTime: { $exists: true, $ne: null }
    });

    res.json({
      totalLeads,
      freshLeads,
      followUpLeads
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get presales leads by category
router.get('/presales-leads/:category', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'presales_agent') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leadStatus, qualifiedStatus, lostStatus] = await Promise.all([
      Status.findOne({ slug: 'lead', type: 'leadStatus' }),
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' })
    ]);

    let filter = {
      presalesUserId: req.user.userId,
      leadStatusId: { $nin: [qualifiedStatus._id, lostStatus._id] }
    };

    let sortOrder = { createdAt: 1 }; // Default ascending by creation date

    if (category === 'fresh') {
      // Fresh leads: no call history at all
      const leadsWithCalls = await CallLog.distinct('leadId');
      filter._id = { $nin: leadsWithCalls };
      sortOrder = { createdAt: 1 }; // Sort by creation date ascending
    } else if (category === 'not-connected') {
      // Not connected leads: have call attempts but never connected
      const notConnectedLeads = await CallLog.distinct('leadId', {
        callStatus: 'not_connected'
      });
      // Exclude leads that have been connected at least once
      const connectedLeads = await CallLog.distinct('leadId', {
        callStatus: 'connected'
      });
      filter._id = { 
        $in: notConnectedLeads,
        $nin: connectedLeads
      };
      sortOrder = { createdAt: 1 };
    } else if (category === 'follow-up') {
      // Follow up leads: have been connected and need follow up
      const followUpLeads = await CallLog.distinct('leadId', {
        $or: [
          { callOutcome: 'follow_up' },
          { followUpAction: 'follow_up' }
        ]
      });
      filter._id = { $in: followUpLeads };
      filter.nextCallDateTime = { $exists: true, $ne: null };
      sortOrder = { nextCallDateTime: 1 };
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('sourceId', 'name')
        .populate('leadStatusId', 'name')
        .populate('languageId', 'name')
        .populate('centerId', 'name')
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit)),
      Lead.countDocuments(filter)
    ]);

    res.json({
      data: leads,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;