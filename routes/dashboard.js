const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CallLog = require('../models/CallLog');
const Status = require('../models/Status');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    // Get user role for filtering
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Get unique lead IDs based on role
    let leadActivityFilter = { deletedAt: null };
    
    if (userRole === 'presales_agent') {
      leadActivityFilter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      leadActivityFilter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
      leadActivityFilter.leadStatusId = { 
        $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
      };
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        leadActivityFilter.leadStatusId = leadStatus._id;
      }
    }
    
    // Get unique lead IDs for the user
    const getUniqueLeadIds = async (additionalFilter = {}) => {
      const pipeline = [
        { $match: { ...leadActivityFilter, ...additionalFilter } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latestActivity' } },
        { $group: { _id: null, leadIds: { $addToSet: '$leadId' } } }
      ];
      
      const result = await LeadActivity.aggregate(pipeline);
      return result.length > 0 ? result[0].leadIds : [];
    };
    
    // Total leads (unique count)
    const totalLeadIds = await getUniqueLeadIds();
    const totalLeads = totalLeadIds.length;
    
    // This week leads (unique count)
    const weekLeadIds = await getUniqueLeadIds({ createdAt: { $gte: startOfWeek } });
    const weekLeads = weekLeadIds.length;
    
    // Today's leads (unique count)
    const todayLeadIds = await getUniqueLeadIds({ createdAt: { $gte: startOfToday } });
    const todayLeads = todayLeadIds.length;
    
    // Today's calls (filter by user for presales and sales agents)
    let callFilter = { deletedAt: null, createdAt: { $gte: startOfToday } };
    if (userRole === 'presales_agent' || userRole === 'sales_agent') {
      callFilter.userId = new mongoose.Types.ObjectId(req.user.userId);
    }
    const todayCalls = await CallLog.countDocuments(callFilter);
    
    // Won leads (unique count)
    const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
    const wonLeadIds = wonStatus ? await getUniqueLeadIds({ leadStatusId: wonStatus._id }) : [];
    const wonLeads = wonLeadIds.length;
    
    // Lost leads (unique count)
    const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
    const lostLeadIds = lostStatus ? await getUniqueLeadIds({ leadStatusId: lostStatus._id }) : [];
    const lostLeads = lostLeadIds.length;
    
    // Weekly lead trend (last 7 days) - unique count
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLeadIds = await getUniqueLeadIds({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      weeklyTrend.push({
        date: date.toISOString().split('T')[0],
        count: dayLeadIds.length
      });
    }
    
    // Get all statuses first
    const allStatuses = await Status.find({ type: 'leadStatus', deletedAt: null });
    
    // Get unique leads with their latest status
    const leadsWithStatus = await LeadActivity.aggregate([
      { $match: leadActivityFilter },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestActivity' } },
      { $group: { _id: '$leadStatusId', count: { $sum: 1 } } }
    ]);
    
    // Build status distribution
    const statusDistribution = [];
    let noStatusCount = 0;
    
    for (const item of leadsWithStatus) {
      if (item._id === null) {
        noStatusCount = item.count;
      } else {
        const status = allStatuses.find(s => s._id.toString() === item._id.toString());
        if (status) {
          statusDistribution.push({
            _id: status.name,
            count: item.count
          });
        }
      }
    }
    
    if (noStatusCount > 0) {
      statusDistribution.push({ _id: 'No Status', count: noStatusCount });
    }
    
    statusDistribution.sort((a, b) => b.count - a.count);
    statusDistribution.splice(6);
    
    res.json({
      totalLeads,
      weekLeads,
      todayLeads,
      todayCalls,
      wonLeads,
      lostLeads,
      weeklyTrend,
      statusDistribution
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;