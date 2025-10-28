const express = require('express');
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const CallLog = require('../models/CallLog');
const Status = require('../models/Status');
const User = require('../models/User');
const Role = require('../models/Role');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Handle preflight OPTIONS requests
router.options('/stats', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
  res.sendStatus(200);
});

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
  try {
    console.log('Fetching dashboard stats for user:', req.user.userId);
    const { presalesAgent, dateRange } = req.query;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    // Get user role for filtering
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    
    // Fetch all required statuses once
    const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
    const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
    const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
    const activeStatus = await Status.findOne({ slug: 'active', type: 'status' });
    
    // Build base filter for leads based on user role and filters (synchronous now)
    const getLeadFilter = (additionalFilter = {}) => {
      let filter = { deletedAt: null };
      
      // Apply role-specific filters first
      if (userRole === 'presales_agent' && !presalesAgent) {
        filter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
      } else if (userRole === 'sales_agent') {
        filter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
        const excludeStatuses = [wonStatus?._id, lostStatus?._id].filter(Boolean);
        if (excludeStatuses.length > 0) {
          filter.leadStatusId = { $nin: excludeStatuses };
        }
      } else if (userRole === 'hod_sales') {
        filter.centreId = user.centreId;
      } else if (userRole === 'sales_manager') {
        filter.centreId = user.centreId;
        if (qualifiedStatus) {
          filter.leadStatusId = qualifiedStatus._id;
        }
      }
      // Admin role - no additional filters, can see all data
      
      // Apply presales agent filter if provided
      if (presalesAgent) {
        filter.presalesUserId = new mongoose.Types.ObjectId(presalesAgent);
      }
      
      // Apply date range filter if provided
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        if (startDate && endDate) {
          filter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          };
        }
      }
      
      // Merge additional filter last to allow overrides
      return { ...filter, ...additionalFilter };
    };
    
    // Presales specific filter - only leads assigned to presales (synchronous)
    const getPresalesLeadFilter = (additionalFilter = {}) => {
      let filter = { deletedAt: null, presalesUserId: { $ne: null } };
      
      // Apply user filter
      if (presalesAgent) {
        filter.presalesUserId = new mongoose.Types.ObjectId(presalesAgent);
      } else if (userRole === 'presales_agent') {
        filter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
      }
      // Admin role - no additional user filter for presales leads
      
      // Apply date range filter if provided
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        if (startDate && endDate) {
          filter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          };
        }
      }
      
      // Merge additional filter last to allow overrides
      return { ...filter, ...additionalFilter };
    };
    
    // For presales agents, use presales-specific metrics
    const isPresalesView = userRole === 'presales_agent' || !!presalesAgent;
    
    // Pre-compute presalesLeadIds once for efficiency
    let presalesLeadIds = [];
    if (isPresalesView) {
      const presalesUserId = presalesAgent ? new mongoose.Types.ObjectId(presalesAgent) : new mongoose.Types.ObjectId(req.user.userId);
      presalesLeadIds = await LeadActivity.find({
        presalesUserId: presalesUserId
      }).distinct('leadId');
    }
    
    // Qualified and lost counts
    let totalQualifiedHistorically = 0, qualifiedMTD = 0, qualifiedToday = 0;
    let totalLostHistorically = 0, lostMTD = 0, lostToday = 0;
    
    if (isPresalesView) {
      // Historical qualified leads (ever qualified)
      if (qualifiedStatus && presalesLeadIds.length > 0) {
        const qualifiedPresalesLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: qualifiedStatus._id
        }).distinct('leadId');
        totalQualifiedHistorically = qualifiedPresalesLeads.length;
      }
      
      // MTD qualified leads
      if (qualifiedStatus && presalesLeadIds.length > 0) {
        const qualifiedMTDLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: qualifiedStatus._id,
          createdAt: { $gte: startOfMonth }
        }).distinct('leadId');
        qualifiedMTD = qualifiedMTDLeads.length;
      }
      
      // Today's qualified leads
      if (qualifiedStatus && presalesLeadIds.length > 0) {
        const qualifiedTodayLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: qualifiedStatus._id,
          createdAt: { $gte: startOfToday }
        }).distinct('leadId');
        qualifiedToday = qualifiedTodayLeads.length;
      }
      
      // Historical lost leads (ever lost)
      if (lostStatus && presalesLeadIds.length > 0) {
        const lostPresalesLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: lostStatus._id
        }).distinct('leadId');
        totalLostHistorically = lostPresalesLeads.length;
      }
      
      // MTD lost leads
      if (lostStatus && presalesLeadIds.length > 0) {
        const lostMTDLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: lostStatus._id,
          createdAt: { $gte: startOfMonth }
        }).distinct('leadId');
        lostMTD = lostMTDLeads.length;
      }
      
      // Today's lost leads
      if (lostStatus && presalesLeadIds.length > 0) {
        const lostTodayLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: lostStatus._id,
          createdAt: { $gte: startOfToday }
        }).distinct('leadId');
        lostToday = lostTodayLeads.length;
      }
    } else {
      const qualifiedFilter = qualifiedStatus ? { leadStatusId: qualifiedStatus._id } : {};
      totalQualifiedHistorically = await Lead.countDocuments(getLeadFilter(qualifiedFilter));
      
      // Use qualifiedDate for consistency with daily trends
      qualifiedMTD = qualifiedStatus ? await Lead.countDocuments(getLeadFilter({ ...qualifiedFilter, qualifiedDate: { $gte: startOfMonth } })) : 0;
      qualifiedToday = qualifiedStatus ? await Lead.countDocuments(getLeadFilter({ ...qualifiedFilter, qualifiedDate: { $gte: startOfToday } })) : 0;
      
      const lostFilter = lostStatus ? { leadStatusId: lostStatus._id } : {};
      totalLostHistorically = await Lead.countDocuments(getLeadFilter(lostFilter));
      
      // Use lostDate for consistency with daily trends
      lostMTD = lostStatus ? await Lead.countDocuments(getLeadFilter({ ...lostFilter, lostDate: { $gte: startOfMonth } })) : 0;
      lostToday = lostStatus ? await Lead.countDocuments(getLeadFilter({ ...lostFilter, lostDate: { $gte: startOfToday } })) : 0;
    }
    
    // Total leads historically (assigned to presales)
    const totalLeadsHistorically = isPresalesView ? 
      await Lead.countDocuments(getPresalesLeadFilter()) :
      await Lead.countDocuments(getLeadFilter());
    
    // Leads Month to Date (assigned to presales)
    const leadsMonthToDate = isPresalesView ?
      await Lead.countDocuments(getPresalesLeadFilter({ createdAt: { $gte: startOfMonth } })) :
      await Lead.countDocuments(getLeadFilter({ createdAt: { $gte: startOfMonth } }));
    
    // Today's leads (assigned to presales)
    const todayLeads = isPresalesView ?
      await Lead.countDocuments(getPresalesLeadFilter({ createdAt: { $gte: startOfToday } })) :
      await Lead.countDocuments(getLeadFilter({ createdAt: { $gte: startOfToday } }));
    
    // Call filters
    const getCallFilter = (additionalFilter = {}) => {
      let filter = { deletedAt: null, ...additionalFilter };
      
      if (presalesAgent) {
        filter.userId = new mongoose.Types.ObjectId(presalesAgent);
      } else if (userRole === 'presales_agent' || userRole === 'sales_agent') {
        filter.userId = new mongoose.Types.ObjectId(req.user.userId);
      }
      // Admin role - no user filter, can see all calls
      
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        if (startDate && endDate) {
          filter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          };
        }
      }
      
      return filter;
    };
    
    // Total calls historically
    const totalCallsHistorically = await CallLog.countDocuments(getCallFilter());
    
    // Calls MTD
    const callsMTD = await CallLog.countDocuments(getCallFilter({ createdAt: { $gte: startOfMonth } }));
    
    // Today's calls
    const todayCalls = await CallLog.countDocuments(getCallFilter({ createdAt: { $gte: startOfToday } }));
    
    // Won and lost leads (filtered by role)
    const wonLeads = wonStatus ? await Lead.countDocuments(getLeadFilter({ leadStatusId: wonStatus._id })) : 0;
    const lostLeads = totalLostHistorically;
    
    // Daily trends (last 30 days)
    const dailyLeadTrend = [];
    const dailyCallTrend = [];
    const dailyLeadsVsCalls = [];
    const dailyQualifiedTrend = [];
    const dailyLostTrend = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLeadCount = isPresalesView ?
        await Lead.countDocuments(getPresalesLeadFilter({ createdAt: { $gte: date, $lt: nextDate } })) :
        await Lead.countDocuments(getLeadFilter({ createdAt: { $gte: date, $lt: nextDate } }));
      
      const dayCallCount = await CallLog.countDocuments(getCallFilter({
        createdAt: { $gte: date, $lt: nextDate }
      }));
      
      // Daily qualified and lost leads count
      let dayQualifiedCount = 0;
      let dayLostCount = 0;
      if (isPresalesView) {
        if (presalesLeadIds.length > 0 && qualifiedStatus) {
          const dayQualifiedLeads = await LeadActivity.find({
            leadId: { $in: presalesLeadIds },
            leadStatusId: qualifiedStatus._id,
            createdAt: { $gte: date, $lt: nextDate }
          }).distinct('leadId');
          dayQualifiedCount = dayQualifiedLeads.length;
        }
        if (presalesLeadIds.length > 0 && lostStatus) {
          const dayLostLeads = await LeadActivity.find({
            leadId: { $in: presalesLeadIds },
            leadStatusId: lostStatus._id,
            createdAt: { $gte: date, $lt: nextDate }
          }).distinct('leadId');
          dayLostCount = dayLostLeads.length;
        }
      } else {
        if (qualifiedStatus) {
          dayQualifiedCount = await Lead.countDocuments(getLeadFilter({ leadStatusId: qualifiedStatus._id, qualifiedDate: { $gte: date, $lt: nextDate } }));
        }
        if (lostStatus) {
          dayLostCount = await Lead.countDocuments(getLeadFilter({ leadStatusId: lostStatus._id, lostDate: { $gte: date, $lt: nextDate } }));
        }
      }
      
      const isoDate = date.toISOString().split('T')[0];
      dailyLeadTrend.push({
        date: isoDate,
        count: dayLeadCount
      });
      
      dailyCallTrend.push({
        date: isoDate,
        count: dayCallCount
      });
      
      dailyQualifiedTrend.push({
        date: isoDate,
        count: dayQualifiedCount
      });
      
      dailyLostTrend.push({
        date: isoDate,
        count: dayLostCount
      });
      
      dailyLeadsVsCalls.push({
        date: isoDate,
        leads: dayLeadCount,
        calls: dayCallCount
      });
    }
    
    // Status distribution
    const statusPipeline = [
      { $match: getLeadFilter() },
      { $group: { _id: '$leadStatusId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'statuses',
          localField: '_id',
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
      { $project: { _id: '$statusName', count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ];
    
    const statusDistribution = await Lead.aggregate(statusPipeline);
    
    // Lead value distribution
    const valuePipeline = [
      { $match: getLeadFilter() },
      { $group: { _id: '$leadValue', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];
    
    const valueResults = await Lead.aggregate(valuePipeline);
    const leadValueDistribution = valueResults.map(item => ({
      _id: item._id || 'Not Set',
      count: item.count
    }));
    
    // Source-wise qualified lead distribution
    const qualifiedFilter = qualifiedStatus ? { leadStatusId: qualifiedStatus._id } : {};
    const sourceQualifiedPipeline = [
      { $match: getLeadFilter(qualifiedFilter) },
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
    ];
    
    const sourceQualifiedDistribution = await Lead.aggregate(sourceQualifiedPipeline);
    
    // Source-wise won lead distribution (filtered)
    const sourceWonPipeline = [
      { $match: getLeadFilter({ leadStatusId: wonStatus?._id }) },
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
    ];
    
    const sourceWonDistribution = await Lead.aggregate(sourceWonPipeline);
    
    // Source-wise lead distribution (all leads)
    const sourcePipeline = [
      { $match: getLeadFilter() },
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
    ];
    
    const sourceDistribution = await Lead.aggregate(sourcePipeline);
    
    // Center-wise distribution
    const centerPipeline = [
      { $match: getLeadFilter() },
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
    ];
    
    const centerDistribution = await Lead.aggregate(centerPipeline);
    
    // Language-wise distribution
    const languagePipeline = [
      { $match: getLeadFilter() },
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
    ];
    
    const languageDistribution = await Lead.aggregate(languagePipeline);
    
    // Lead sub-status distribution for sales users and admin
    let leadSubStatusDistribution = [];
    if (userRole === 'sales_agent' || userRole === 'admin' || userRole === 'hod_sales' || userRole === 'sales_manager') {
      let subStatusFilter = { deletedAt: null };
      
      if (userRole === 'sales_agent') {
        subStatusFilter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
        const excludeStatuses = [wonStatus?._id, lostStatus?._id].filter(Boolean);
        if (excludeStatuses.length > 0) {
          subStatusFilter.leadStatusId = { $nin: excludeStatuses };
        }
      } else if (userRole === 'hod_sales' || userRole === 'sales_manager') {
        subStatusFilter.centreId = user.centreId;
      }
      // Admin sees all
      
      const subStatusPipeline = [
        { $match: subStatusFilter },
        { $group: { _id: '$leadSubStatusId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'statuses',
            localField: '_id',
            foreignField: '_id',
            as: 'subStatus'
          }
        },
        {
          $addFields: {
            subStatusName: {
              $cond: {
                if: { $gt: [{ $size: '$subStatus' }, 0] },
                then: { $arrayElemAt: ['$subStatus.name', 0] },
                else: 'No Sub Status'
              }
            }
          }
        },
        { $project: { _id: '$subStatusName', count: 1 } },
        { $sort: { count: -1 } }
      ];
      
      leadSubStatusDistribution = await Lead.aggregate(subStatusPipeline);
    }
    
    // Get user counts based on role
    let totalUsers = 0;
    let activeUsers = 0;
    
    if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      // Only show presales users
      const presalesRoles = await Role.find({ 
        slug: { $in: ['presales_agent', 'hod_presales', 'manager_presales'] }
      });
      const presalesRoleIds = presalesRoles.map(role => role._id);
      
      totalUsers = await User.countDocuments({ 
        deletedAt: null,
        roleId: { $in: presalesRoleIds }
      });
      
      activeUsers = activeStatus ? await User.countDocuments({ 
        deletedAt: null,
        roleId: { $in: presalesRoleIds },
        statusId: activeStatus._id
      }) : 0;
    } else if (userRole === 'hod_sales' || userRole === 'sales_manager') {
      // Only show users from their center
      totalUsers = await User.countDocuments({ 
        deletedAt: null,
        centreId: user.centreId
      });
      
      activeUsers = activeStatus ? await User.countDocuments({ 
        deletedAt: null,
        centreId: user.centreId,
        statusId: activeStatus._id
      }) : 0;
    } else {
      // Show all users for other roles
      totalUsers = await User.countDocuments({ deletedAt: null });
      activeUsers = activeStatus ? await User.countDocuments({ 
        deletedAt: null,
        statusId: activeStatus._id
      }) : 0;
    }
    
    // Calculate MQL percentage (for presales: qualified/allocated)
    const mqlPercentage = totalLeadsHistorically > 0 ? ((totalQualifiedHistorically / totalLeadsHistorically) * 100).toFixed(2) : 0;
    
    // Daily MQL percentage for presales
    const dailyMqlPercentage = todayLeads > 0 ? ((qualifiedToday / todayLeads) * 100).toFixed(2) : 0;
    
    res.json({
      // Numbers at top
      totalLeadsHistorically,
      leadsMonthToDate,
      todayLeads,
      totalCallsHistorically,
      callsMTD,
      todayCalls,
      totalQualifiedHistorically,
      qualifiedMTD,
      qualifiedToday,
      
      // Legacy fields for compatibility
      totalLeads: totalLeadsHistorically,
      weekLeads: leadsMonthToDate,
      wonLeads,
      lostLeads,
      
      // Trends
      dailyLeadTrend,
      dailyCallTrend,
      weeklyTrend: dailyLeadTrend, // For backward compatibility
      weeklyCallTrend: dailyCallTrend,
      
      // MQL percentage
      mqlPercentage,
      dailyMqlPercentage,
      dailyLeadsVsCalls,
      dailyQualifiedTrend,
      dailyLostTrend,
      
      // Lost leads (now included for all views)
      totalLostHistorically,
      lostMTD,
      lostToday,
      
      // Charts data
      statusDistribution,
      leadValueDistribution,
      sourceDistribution,
      sourceQualifiedDistribution,
      sourceWonDistribution,
      centerDistribution,
      languageDistribution,
      leadSubStatusDistribution,
      totalUsers,
      activeUsers
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get presales agents for filter dropdown
router.get('/presales-agents', authenticateToken, async (req, res) => {
  try {
    const presalesRole = await Role.findOne({ slug: 'presales_agent' });
    if (!presalesRole) {
      return res.json([]);
    }
    
    const presalesAgents = await User.find({
      roleId: presalesRole._id,
      deletedAt: null
    }).select('name _id');
    
    res.json(presalesAgents);
  } catch (error) {
    console.error('Error fetching presales agents:', error);
    res.status(500).json({ error: 'Failed to fetch presales agents' });
  }
});

module.exports = router;