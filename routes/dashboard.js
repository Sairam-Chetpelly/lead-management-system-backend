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
    

    
    // Count unique leads using same logic as leads table
    const getUniqueLeadCount = async (additionalFilter = {}) => {
      const pipeline = [
        { $match: { deletedAt: null, ...additionalFilter } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latestActivity' } }
      ];
      
      // Apply role-based filtering after grouping (same as leads table)
      let postGroupFilter = {};
      if (userRole === 'presales_agent') {
        postGroupFilter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
        const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
        if (leadStatus) {
          postGroupFilter.leadStatusId = leadStatus._id;
        }
      } else if (userRole === 'sales_agent') {
        const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
        const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
        postGroupFilter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
        postGroupFilter.leadStatusId = { 
          $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
        };
      } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
        const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
        if (leadStatus) {
          postGroupFilter.leadStatusId = leadStatus._id;
        }
      }
      
      if (Object.keys(postGroupFilter).length > 0) {
        pipeline.push({ $match: postGroupFilter });
      }
      
      pipeline.push({ $count: 'total' });
      
      const result = await LeadActivity.aggregate(pipeline);
      return result.length > 0 ? result[0].total : 0;
    };
    
    // Total leads (unique count)
    const totalLeads = await getUniqueLeadCount();
    
    // This week leads (unique count)
    const weekLeads = await getUniqueLeadCount({ createdAt: { $gte: startOfWeek } });
    
    // Today's leads (unique count)
    const todayLeads = await getUniqueLeadCount({ createdAt: { $gte: startOfToday } });
    
    // Today's calls (filter by user for presales and sales agents)
    let callFilter = { deletedAt: null, createdAt: { $gte: startOfToday } };
    if (userRole === 'presales_agent' || userRole === 'sales_agent') {
      callFilter.userId = new mongoose.Types.ObjectId(req.user.userId);
    }
    const todayCalls = await CallLog.countDocuments(callFilter);
    
    // Won leads (unique count) - don't apply role filters for won/lost counts
    const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
    const wonLeads = wonStatus ? await LeadActivity.aggregate([
      { $match: { deletedAt: null, leadStatusId: wonStatus._id } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $count: 'total' }
    ]).then(result => result.length > 0 ? result[0].total : 0) : 0;
    
    // Lost leads (unique count) - don't apply role filters for won/lost counts
    const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
    const lostLeads = lostStatus ? await LeadActivity.aggregate([
      { $match: { deletedAt: null, leadStatusId: lostStatus._id } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $count: 'total' }
    ]).then(result => result.length > 0 ? result[0].total : 0) : 0;
    
    // Weekly lead trend (last 7 days) - unique count
    const weeklyTrend = [];
    const weeklyCallTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLeadCount = await getUniqueLeadCount({
        createdAt: { $gte: date, $lt: nextDate }
      });
      
      // Daily call count for presales agents
      let dayCallFilter = { deletedAt: null, createdAt: { $gte: date, $lt: nextDate } };
      if (userRole === 'presales_agent') {
        dayCallFilter.userId = new mongoose.Types.ObjectId(req.user.userId);
      }
      const dayCallCount = await CallLog.countDocuments(dayCallFilter);
      
      weeklyTrend.push({
        date: date.toISOString().split('T')[0],
        count: dayLeadCount
      });
      
      weeklyCallTrend.push({
        date: date.toISOString().split('T')[0],
        count: dayCallCount
      });
    }
    
    // Get all statuses first
    const allStatuses = await Status.find({ type: 'leadStatus', deletedAt: null });
    
    // Get unique leads with their latest status using same filtering
    const statusPipeline = [
      { $match: { deletedAt: null } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestActivity' } }
    ];
    
    // Apply same role-based filtering
    let postGroupFilter = {};
    if (userRole === 'presales_agent') {
      postGroupFilter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        postGroupFilter.leadStatusId = leadStatus._id;
      }
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      postGroupFilter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
      postGroupFilter.leadStatusId = { 
        $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
      };
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) {
        postGroupFilter.leadStatusId = leadStatus._id;
      }
    }
    
    if (Object.keys(postGroupFilter).length > 0) {
      statusPipeline.push({ $match: postGroupFilter });
    }
    
    statusPipeline.push({ $group: { _id: '$leadStatusId', count: { $sum: 1 } } });
    
    const leadsWithStatus = await LeadActivity.aggregate(statusPipeline);
    
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
    
    // Lead value distribution for presales agents
    let leadValueDistribution = [];
    if (userRole === 'presales_agent') {
      const valuePipeline = [
        { $match: { deletedAt: null } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$latestActivity' } },
        { $match: { presalesUserId: new mongoose.Types.ObjectId(req.user.userId) } },
        { $group: { _id: '$leadValue', count: { $sum: 1 } } }
      ];
      
      const valueResults = await LeadActivity.aggregate(valuePipeline);
      leadValueDistribution = valueResults.map(item => ({
        _id: item._id || 'Not Set',
        count: item.count
      }));
    }
    
    // Source-wise lead distribution based on user role
    const sourcePipeline = [
      { $match: { deletedAt: null } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestActivity' } }
    ];
    
    // Apply role-based filtering
    let sourcePostGroupFilter = {};
    if (userRole === 'presales_agent') {
      sourcePostGroupFilter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      sourcePostGroupFilter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
      sourcePostGroupFilter.leadStatusId = { 
        $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
      };
    }
    
    if (Object.keys(sourcePostGroupFilter).length > 0) {
      sourcePipeline.push({ $match: sourcePostGroupFilter });
    }
    
    sourcePipeline.push(
      {
        $lookup: {
          from: 'leadsources',
          localField: 'sourceId',
          foreignField: '_id',
          as: 'source'
        }
      },
      {
        $addFields: {
          sourceName: {
            $cond: {
              if: { $gt: [{ $size: '$source' }, 0] },
              then: { $arrayElemAt: ['$source.name', 0] },
              else: 'Unknown Source'
            }
          }
        }
      },
      { $group: { _id: '$sourceName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    );
    
    const sourceDistribution = await LeadActivity.aggregate(sourcePipeline);
    
    // Center-wise distribution
    const centerPipeline = [
      { $match: { deletedAt: null } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestActivity' } }
    ];
    
    if (Object.keys(sourcePostGroupFilter).length > 0) {
      centerPipeline.push({ $match: sourcePostGroupFilter });
    }
    
    centerPipeline.push(
      {
        $lookup: {
          from: 'centres',
          localField: 'centreId',
          foreignField: '_id',
          as: 'centre'
        }
      },
      {
        $addFields: {
          centreName: {
            $cond: {
              if: { $gt: [{ $size: '$centre' }, 0] },
              then: { $arrayElemAt: ['$centre.name', 0] },
              else: 'No Centre'
            }
          }
        }
      },
      { $group: { _id: '$centreName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    );
    
    const centerDistribution = await LeadActivity.aggregate(centerPipeline);
    
    // Language-wise distribution
    const languagePipeline = [
      { $match: { deletedAt: null } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$leadId', latestActivity: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latestActivity' } }
    ];
    
    if (Object.keys(sourcePostGroupFilter).length > 0) {
      languagePipeline.push({ $match: sourcePostGroupFilter });
    }
    
    languagePipeline.push(
      {
        $lookup: {
          from: 'languages',
          localField: 'languageId',
          foreignField: '_id',
          as: 'language'
        }
      },
      {
        $addFields: {
          languageName: {
            $cond: {
              if: { $gt: [{ $size: '$language' }, 0] },
              then: { $arrayElemAt: ['$language.name', 0] },
              else: 'No Language'
            }
          }
        }
      },
      { $group: { _id: '$languageName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    );
    
    const languageDistribution = await LeadActivity.aggregate(languagePipeline);
    
    res.json({
      totalLeads,
      weekLeads,
      todayLeads,
      todayCalls,
      wonLeads,
      lostLeads,
      weeklyTrend,
      weeklyCallTrend,
      statusDistribution,
      leadValueDistribution,
      sourceDistribution,
      centerDistribution,
      languageDistribution
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;