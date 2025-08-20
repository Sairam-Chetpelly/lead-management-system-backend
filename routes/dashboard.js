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
    
    // Base filter for role-based access
    let baseFilter = { deletedAt: null };
    
    if (userRole === 'presales_agent') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      baseFilter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
      if (leadStatus) {
        baseFilter.leadStatusId = leadStatus._id;
      }
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        baseFilter.leadStatusId = leadStatus._id;
      }
    }
    
    // Get lead statuses
    const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
    const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
    
    // Total leads
    const totalLeads = await LeadActivity.countDocuments(baseFilter);
    
    // This week leads
    const weekLeads = await LeadActivity.countDocuments({
      ...baseFilter,
      createdAt: { $gte: startOfWeek }
    });
    
    // Today's leads
    const todayLeads = await LeadActivity.countDocuments({
      ...baseFilter,
      createdAt: { $gte: startOfToday }
    });
    
    // Today's calls (filter by user for presales agents)
    let callFilter = { deletedAt: null, createdAt: { $gte: startOfToday } };
    if (userRole === 'presales_agent') {
      callFilter.userId = new mongoose.Types.ObjectId(req.user.userId);
    }
    const todayCalls = await CallLog.countDocuments(callFilter);
    
    // Won leads
    const wonLeads = wonStatus ? await LeadActivity.countDocuments({
      ...baseFilter,
      leadStatusId: wonStatus._id
    }) : 0;
    
    // Lost leads
    const lostLeads = lostStatus ? await LeadActivity.countDocuments({
      ...baseFilter,
      leadStatusId: lostStatus._id
    }) : 0;
    
    // Weekly lead trend (last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = await LeadActivity.countDocuments({
        ...baseFilter,
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      weeklyTrend.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }
    
    // Lead status distribution
    const statusDistribution = await LeadActivity.aggregate([
      { $match: baseFilter },
      {
        $lookup: {
          from: 'statuses',
          localField: 'leadStatusId',
          foreignField: '_id',
          as: 'status'
        }
      },
      {
        $addFields: {
          statusName: {
            $cond: {
              if: { $gt: [{ $size: '$status' }, 0] },
              then: { $arrayElemAt: ['$status.name', 0] },
              else: 'No Status'
            }
          }
        }
      },
      {
        $group: {
          _id: '$statusName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);
    
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