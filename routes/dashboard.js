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
        presalesUserId: presalesUserId,
        deletedAt: null
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
          leadStatusId: qualifiedStatus._id,
          deletedAt: null
        }).distinct('leadId');
        totalQualifiedHistorically = qualifiedPresalesLeads.length;
      }

      // MTD qualified leads
      if (qualifiedStatus && presalesLeadIds.length > 0) {
        const qualifiedMTDLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: qualifiedStatus._id,
          createdAt: { $gte: startOfMonth },
          deletedAt: null
        }).distinct('leadId');
        qualifiedMTD = qualifiedMTDLeads.length;
      }

      // Today's qualified leads
      if (qualifiedStatus && presalesLeadIds.length > 0) {
        const qualifiedTodayLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: qualifiedStatus._id,
          createdAt: { $gte: startOfToday },
          deletedAt: null
        }).distinct('leadId');
        qualifiedToday = qualifiedTodayLeads.length;
      }

      // Historical lost leads (ever lost)
      if (lostStatus && presalesLeadIds.length > 0) {
        const lostPresalesLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: lostStatus._id,
          deletedAt: null
        }).distinct('leadId');
        totalLostHistorically = lostPresalesLeads.length;
      }

      // MTD lost leads
      if (lostStatus && presalesLeadIds.length > 0) {
        const lostMTDLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: lostStatus._id,
          createdAt: { $gte: startOfMonth },
          deletedAt: null
        }).distinct('leadId');
        lostMTD = lostMTDLeads.length;
      }

      // Today's lost leads
      if (lostStatus && presalesLeadIds.length > 0) {
        const lostTodayLeads = await LeadActivity.find({
          leadId: { $in: presalesLeadIds },
          leadStatusId: lostStatus._id,
          createdAt: { $gte: startOfToday },
          deletedAt: null
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
      lostMTD = lostStatus ? await Lead.countDocuments(getLeadFilter({ ...lostFilter, leadLostDate: { $gte: startOfMonth } })) : 0;
      lostToday = lostStatus ? await Lead.countDocuments(getLeadFilter({ ...lostFilter, leadLostDate: { $gte: startOfToday } })) : 0;
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
            createdAt: { $gte: date, $lt: nextDate },
            deletedAt: null
          }).distinct('leadId');
          dayQualifiedCount = dayQualifiedLeads.length;
        }
        if (presalesLeadIds.length > 0 && lostStatus) {
          const dayLostLeads = await LeadActivity.find({
            leadId: { $in: presalesLeadIds },
            leadStatusId: lostStatus._id,
            createdAt: { $gte: date, $lt: nextDate },
            deletedAt: null
          }).distinct('leadId');
          dayLostCount = dayLostLeads.length;
        }
      } else {
        if (qualifiedStatus) {
          dayQualifiedCount = await Lead.countDocuments(getLeadFilter({ leadStatusId: qualifiedStatus._id, qualifiedDate: { $gte: date, $lt: nextDate } }));
        }
        if (lostStatus) {
          dayLostCount = await Lead.countDocuments(getLeadFilter({ leadStatusId: lostStatus._id, leadLostDate: { $gte: date, $lt: nextDate } }));
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

// Sales dashboard
router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    if (!['sales_agent', 'hod_sales', 'sales_manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const filter = { deletedAt: null };
    if (userRole === 'sales_agent') {
      filter.salesUserId = req.user.userId;
    } else if (['hod_sales', 'sales_manager'].includes(userRole)) {
      filter.centreId = user.centreId;
    }

    const [wonStatus, lostStatus] = await Promise.all([
      Status.findOne({ slug: 'won', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' })
    ]);

    const [myLeads, won, lost, calls] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, leadStatusId: wonStatus?._id }),
      Lead.countDocuments({ ...filter, leadStatusId: lostStatus?._id }),
      CallLog.countDocuments({ userId: req.user.userId, deletedAt: null })
    ]);

    res.json({ myLeads, won, lost, calls, role: 'sales' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales dashboard' });
  }
});

// Admin dashboard
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    if (!['admin', 'marketing', 'presales_agent'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let { userType, agentId, startDate, endDate, sourceId } = req.query;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date();
    startOfToday.setHours(5, 30, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Auto-set filters for presales agents
    if (userRole === 'presales_agent') {
      userType = 'presales';
      agentId = req.user.userId;
    }

    // Build filters
    const leadFilter = { deletedAt: null };
    const callFilter = { deletedAt: null };
    let useLeadActivity = false;
    let leadActivityFilter = { deletedAt: null };

    // Apply agent filter
    if (agentId && agentId !== 'all') {
      if (userType === 'sales') {
        // For sales, use LeadActivity table to get accurate counts
        useLeadActivity = true;
        leadActivityFilter.salesUserId = new mongoose.Types.ObjectId(agentId);
      } else if (userType === 'presales') {
        // For presales, use LeadActivity table to get accurate counts
        useLeadActivity = true;
        leadActivityFilter.presalesUserId = new mongoose.Types.ObjectId(agentId);
      } else {
        leadFilter.$or = [{ salesUserId: agentId }, { presalesUserId: agentId }];
      }
      callFilter.userId = new mongoose.Types.ObjectId(agentId);
    }

    // Apply source filter
    if (sourceId && sourceId !== 'all') {
      leadFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
      leadActivityFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
    }

    // Apply date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.$gte = new Date(startDate);
      dateFilter.$lte = new Date(endDate);
    }

    const [qualifiedStatus, lostStatus, wonStatus] = await Promise.all([
      Status.findOne({ slug: 'qualified', type: 'leadStatus' }),
      Status.findOne({ slug: 'lost', type: 'leadStatus' }),
      Status.findOne({ slug: 'won', type: 'leadStatus' })
    ]);

    // Get counts with filters applied
    const getLeadFilter = (additional = {}) => ({ ...leadFilter, ...additional });
    const getLeadActivityFilter = (additional = {}) => ({ ...leadActivityFilter, ...additional });
    const getCallFilter = (additional = {}) => ({ ...callFilter, ...additional });

    // Build date filters similar to leads API
    let createdAtFilter = {};
    if (startDate && endDate) {
      createdAtFilter = {
        $gte: new Date(startDate),
        $lte: (() => {
          const toDate = new Date(endDate);
          toDate.setHours(23, 59, 59, 999);
          return toDate;
        })()
      };
    }

    // Use date filters for MTD if dates provided, otherwise use current month
    const mtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };
    const qualifiedMtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };
    const lostMtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };
    const wonMtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };

    let totalLeads, leadsMTD, leadsToday, totalQualified, qualifiedMTD, qualifiedToday, totalLost, lostMTD, lostToday, totalWon, wonMTD, wonToday;

    if (useLeadActivity) {
      // Get all leads ever assigned to this user
      const assignedLeadIds = await LeadActivity.distinct('leadId', getLeadActivityFilter());

      // Use Lead table with assigned lead IDs for accurate lead creation dates
      if (assignedLeadIds.length > 0) {
        // Build lead match filter with source filter applied
        const leadMatchFilter = { _id: { $in: assignedLeadIds } };
        if (sourceId && sourceId !== 'all') {
          leadMatchFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
        }

        [totalLeads, leadsMTD, leadsToday] = await Promise.all([
          // Total leads using Lead table createdAt
          Lead.countDocuments({ ...leadMatchFilter, ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}) }),
          Lead.countDocuments({ ...leadMatchFilter, createdAt: mtdFilter }),
          Lead.countDocuments({ ...leadMatchFilter, createdAt: { $gte: startOfToday, $lte: endOfToday } })
        ]);
      } else {
        totalLeads = leadsMTD = leadsToday = 0;
      }

      // For qualified/lost/won, check current status of leads that were ever assigned to this user
      if (assignedLeadIds.length > 0) {
        [totalQualified, qualifiedMTD, qualifiedToday, totalLost, lostMTD, lostToday, totalWon, wonMTD, wonToday] = await Promise.all([
          // Qualified leads - current status of assigned leads
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: qualifiedStatus?._id, ...(Object.keys(createdAtFilter).length ? { qualifiedDate: createdAtFilter } : {}) }),
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: qualifiedStatus?._id, qualifiedDate: qualifiedMtdFilter }),
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: startOfToday, $lte: endOfToday } }),
          // Lost leads - current status of assigned leads
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: lostStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadLostDate: createdAtFilter } : {}) }),
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: lostStatus?._id, leadLostDate: lostMtdFilter }),
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: lostStatus?._id, leadLostDate: { $gte: startOfToday, $lte: endOfToday } }),
          // Won leads - current status of assigned leads
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: wonStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadWonDate: createdAtFilter } : {}) }),
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: wonStatus?._id, leadWonDate: wonMtdFilter }),
          Lead.countDocuments({ _id: { $in: assignedLeadIds }, leadStatusId: wonStatus?._id, leadWonDate: { $gte: startOfToday, $lte: endOfToday } })
        ]);
      } else {
        totalLeads = leadsMTD = leadsToday = totalQualified = qualifiedMTD = qualifiedToday = totalLost = lostMTD = lostToday = totalWon = wonMTD = wonToday = 0;
      }
    } else {
      // Apply source filter to leadFilter for all queries
      const baseLeadFilter = getLeadFilter();

      // Use Lead table for other cases
      [totalLeads, leadsMTD, leadsToday, totalQualified, qualifiedMTD, qualifiedToday, totalLost, lostMTD, lostToday, totalWon, wonMTD, wonToday] = await Promise.all([
        // Total leads
        Lead.countDocuments({ ...baseLeadFilter, ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}) }),
        Lead.countDocuments({ ...baseLeadFilter, createdAt: mtdFilter }),
        Lead.countDocuments({ ...baseLeadFilter, createdAt: { $gte: startOfToday, $lte: endOfToday } }),
        // Qualified leads
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: qualifiedStatus?._id, ...(Object.keys(createdAtFilter).length ? { qualifiedDate: createdAtFilter } : {}) }),
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: qualifiedMtdFilter }),
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: startOfToday, $lte: endOfToday } }),
        // Lost leads
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: lostStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadLostDate: createdAtFilter } : {}) }),
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: lostStatus?._id, leadLostDate: lostMtdFilter }),
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: lostStatus?._id, leadLostDate: { $gte: startOfToday, $lte: endOfToday } }),
        // Won leads
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: wonStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadWonDate: createdAtFilter } : {}) }),
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: wonStatus?._id, leadWonDate: wonMtdFilter }),
        Lead.countDocuments({ ...baseLeadFilter, leadStatusId: wonStatus?._id, leadWonDate: { $gte: startOfToday, $lte: endOfToday } })
      ]);
    }

    // Get call counts
    const [totalCalls, callsMTD, callsToday] = await Promise.all([
      CallLog.countDocuments(getCallFilter(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {})),
      CallLog.countDocuments(getCallFilter({ createdAt: mtdFilter })),
      CallLog.countDocuments(getCallFilter({ createdAt: { $gte: startOfToday, $lte: endOfToday } }))
    ]);

    // Daily trends using aggregation for better performance
    let chartStartDate, chartEndDate;
    if (startDate && endDate) {
      chartStartDate = new Date(startDate);
      chartEndDate = new Date(endDate);
    } else {
      chartEndDate = new Date();
      chartStartDate = new Date();
      chartStartDate.setDate(chartStartDate.getDate() - 29);
    }

    let dailyLeads = [], dailyCalls = [], dailyQualified = [], dailyLost = [], dailyWon = [];

    if (useLeadActivity) {
      // Get assigned lead IDs first
      const assignedLeadIds = await LeadActivity.distinct('leadId', getLeadActivityFilter());

      // Build lead match filter with source filter applied
      const leadMatchFilter = { _id: { $in: assignedLeadIds }, createdAt: { $gte: chartStartDate, $lte: chartEndDate } };
      if (sourceId && sourceId !== 'all') {
        leadMatchFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
      }

      // Use aggregation for daily trends
      const [leadTrends, callTrends, qualifiedTrends, lostTrends, wonTrends] = await Promise.all([
        // Get leads assigned to this user and their creation dates
        Lead.aggregate([
          { $match: leadMatchFilter },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        CallLog.aggregate([
          { $match: { ...getCallFilter(), createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        assignedLeadIds.length > 0 ? Lead.aggregate([
          { $match: { ...leadMatchFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$qualifiedDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]) : [],
        assignedLeadIds.length > 0 ? Lead.aggregate([
          { $match: { ...leadMatchFilter, leadStatusId: lostStatus?._id, leadLostDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$leadLostDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]) : [],
        assignedLeadIds.length > 0 ? Lead.aggregate([
          { $match: { ...leadMatchFilter, leadStatusId: wonStatus?._id, leadWonDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$leadWonDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]) : []
      ]);

      // Convert to arrays with all dates
      const dateRange = [];
      const currentDate = new Date(chartStartDate);
      while (currentDate <= chartEndDate) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      dailyLeads = dateRange.map(date => ({ date, count: leadTrends.find(t => t._id === date)?.count || 0 }));
      dailyCalls = dateRange.map(date => ({ date, count: callTrends.find(t => t._id === date)?.count || 0 }));
      dailyQualified = dateRange.map(date => ({ date, count: qualifiedTrends.find(t => t._id === date)?.count || 0 }));
      dailyLost = dateRange.map(date => ({ date, count: lostTrends.find(t => t._id === date)?.count || 0 }));
      dailyWon = dateRange.map(date => ({ date, count: wonTrends.find(t => t._id === date)?.count || 0 }));
    } else {
      // Use aggregation for regular leads
      const baseLeadFilter = getLeadFilter();
      const [leadTrends, callTrends, qualifiedTrends, lostTrends, wonTrends] = await Promise.all([
        Lead.aggregate([
          { $match: { ...baseLeadFilter, createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        CallLog.aggregate([
          { $match: { ...getCallFilter(), createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Lead.aggregate([
          { $match: { ...baseLeadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$qualifiedDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Lead.aggregate([
          { $match: { ...baseLeadFilter, leadStatusId: lostStatus?._id, leadLostDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$leadLostDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Lead.aggregate([
          { $match: { ...baseLeadFilter, leadStatusId: wonStatus?._id, leadWonDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$leadWonDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);

      // Convert to arrays with all dates
      const dateRange = [];
      const currentDate = new Date(chartStartDate);
      while (currentDate <= chartEndDate) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      dailyLeads = dateRange.map(date => ({ date, count: leadTrends.find(t => t._id === date)?.count || 0 }));
      dailyCalls = dateRange.map(date => ({ date, count: callTrends.find(t => t._id === date)?.count || 0 }));
      dailyQualified = dateRange.map(date => ({ date, count: qualifiedTrends.find(t => t._id === date)?.count || 0 }));
      dailyLost = dateRange.map(date => ({ date, count: lostTrends.find(t => t._id === date)?.count || 0 }));
      dailyWon = dateRange.map(date => ({ date, count: wonTrends.find(t => t._id === date)?.count || 0 }));
    }

    // Source-wise data
    let sourceLeads, sourceQualified, sourceWon;

    if (useLeadActivity) {
      // Get assigned lead IDs first
      const assignedLeadIds = await LeadActivity.distinct('leadId', getLeadActivityFilter());

      if (assignedLeadIds.length > 0) {
        // Build lead match filter with source filter applied
        const sourceMatchFilter = { _id: { $in: assignedLeadIds } };
        if (sourceId && sourceId !== 'all') {
          sourceMatchFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
        }

        // Use Lead table with assigned lead IDs for source distribution
        sourceLeads = await Lead.aggregate([
          { $match: sourceMatchFilter },
          { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
          { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
          { $group: { _id: '$sourceName', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);

        sourceQualified = await Lead.aggregate([
          { $match: { ...sourceMatchFilter, leadStatusId: qualifiedStatus?._id } },
          { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
          { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
          { $group: { _id: '$sourceName', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);

        sourceWon = await Lead.aggregate([
          { $match: { ...sourceMatchFilter, leadStatusId: wonStatus?._id } },
          { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
          { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
          { $group: { _id: '$sourceName', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
      } else {
        sourceLeads = sourceQualified = sourceWon = [];
      }
    } else {
      // Use Lead table for source distribution
      const baseLeadFilter = getLeadFilter();
      sourceLeads = await Lead.aggregate([
        { $match: baseLeadFilter },
        { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
        { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
        { $group: { _id: '$sourceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      sourceQualified = await Lead.aggregate([
        { $match: { ...baseLeadFilter, leadStatusId: qualifiedStatus?._id } },
        { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
        { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
        { $group: { _id: '$sourceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      sourceWon = await Lead.aggregate([
        { $match: { ...baseLeadFilter, leadStatusId: wonStatus?._id } },
        { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
        { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
        { $group: { _id: '$sourceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
    }

    // Visit and meeting data
    let siteVisits, centerVisits, virtualMeetings;

    if (useLeadActivity) {
      // Get assigned lead IDs first
      const assignedLeadIds = await LeadActivity.distinct('leadId', getLeadActivityFilter());

      if (assignedLeadIds.length > 0) {
        // Build visit filter with source filter applied
        const visitMatchFilter = { _id: { $in: assignedLeadIds } };
        if (sourceId && sourceId !== 'all') {
          visitMatchFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
        }

        [siteVisits, centerVisits, virtualMeetings] = await Promise.all([
          Lead.countDocuments({ ...visitMatchFilter, siteVisit: true }),
          Lead.countDocuments({ ...visitMatchFilter, centerVisit: true }),
          Lead.countDocuments({ ...visitMatchFilter, virtualMeeting: true })
        ]);
      } else {
        siteVisits = centerVisits = virtualMeetings = 0;
      }
    } else {
      const baseLeadFilter = getLeadFilter();
      [siteVisits, centerVisits, virtualMeetings] = await Promise.all([
        Lead.countDocuments({ ...baseLeadFilter, siteVisit: true }),
        Lead.countDocuments({ ...baseLeadFilter, centerVisit: true }),
        Lead.countDocuments({ ...baseLeadFilter, virtualMeeting: true })
      ]);
    }

    // Daily visit and meeting trends using aggregation
    let dailySiteVisits = [], dailyCenterVisits = [], dailyVirtualMeetings = [];

    if (useLeadActivity) {
      // Get assigned lead IDs first
      const assignedLeadIds = await LeadActivity.distinct('leadId', getLeadActivityFilter());

      if (assignedLeadIds.length > 0) {
        // Build visit match filter with source filter applied
        const visitMatchFilter = { _id: { $in: assignedLeadIds } };
        if (sourceId && sourceId !== 'all') {
          visitMatchFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
        }

        // Use aggregation for daily visit trends
        const [siteVisitTrends, centerVisitTrends, virtualMeetingTrends] = await Promise.all([
          Lead.aggregate([
            { $match: { ...visitMatchFilter, siteVisit: true, siteVisitCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$siteVisitCompletedDate" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]),
          Lead.aggregate([
            { $match: { ...visitMatchFilter, centerVisit: true, centerVisitCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$centerVisitCompletedDate" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]),
          Lead.aggregate([
            { $match: { ...visitMatchFilter, virtualMeeting: true, virtualMeetingCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$virtualMeetingCompletedDate" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ])
        ]);

        // Convert to arrays with all dates
        const dateRange = [];
        const currentDate = new Date(chartStartDate);
        while (currentDate <= chartEndDate) {
          dateRange.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        dailySiteVisits = dateRange.map(date => ({ date, count: siteVisitTrends.find(t => t._id === date)?.count || 0 }));
        dailyCenterVisits = dateRange.map(date => ({ date, count: centerVisitTrends.find(t => t._id === date)?.count || 0 }));
        dailyVirtualMeetings = dateRange.map(date => ({ date, count: virtualMeetingTrends.find(t => t._id === date)?.count || 0 }));
      } else {
        // No assigned leads, return empty arrays with dates
        const dateRange = [];
        const currentDate = new Date(chartStartDate);
        while (currentDate <= chartEndDate) {
          dateRange.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        dailySiteVisits = dateRange.map(date => ({ date, count: 0 }));
        dailyCenterVisits = dateRange.map(date => ({ date, count: 0 }));
        dailyVirtualMeetings = dateRange.map(date => ({ date, count: 0 }));
      }
    } else {
      // Use aggregation for regular leads
      const baseLeadFilter = getLeadFilter();
      const [siteVisitTrends, centerVisitTrends, virtualMeetingTrends] = await Promise.all([
        Lead.aggregate([
          { $match: { ...baseLeadFilter, siteVisit: true, siteVisitCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$siteVisitCompletedDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Lead.aggregate([
          { $match: { ...baseLeadFilter, centerVisit: true, centerVisitCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$centerVisitCompletedDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Lead.aggregate([
          { $match: { ...baseLeadFilter, virtualMeeting: true, virtualMeetingCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$virtualMeetingCompletedDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      ]);

      // Convert to arrays with all dates
      const dateRange = [];
      const currentDate = new Date(chartStartDate);
      while (currentDate <= chartEndDate) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      dailySiteVisits = dateRange.map(date => ({ date, count: siteVisitTrends.find(t => t._id === date)?.count || 0 }));
      dailyCenterVisits = dateRange.map(date => ({ date, count: centerVisitTrends.find(t => t._id === date)?.count || 0 }));
      dailyVirtualMeetings = dateRange.map(date => ({ date, count: virtualMeetingTrends.find(t => t._id === date)?.count || 0 }));
    }

    // Additional charts for agent filters
    let dailyQualificationRate = [], dailyCallsPerLead = [];

    if (useLeadActivity && (userType === 'presales' || userType === 'sales')) {
      // Get assigned lead IDs first
      const assignedLeadIds = await LeadActivity.distinct('leadId', getLeadActivityFilter());

      if (assignedLeadIds.length > 0) {
        // Build match filter with source filter applied
        const agentMatchFilter = { _id: { $in: assignedLeadIds } };
        if (sourceId && sourceId !== 'all') {
          agentMatchFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
        }

        // Daily qualification rate and calls per lead
        const dateRange = [];
        const currentDate = new Date(chartStartDate);
        while (currentDate <= chartEndDate) {
          dateRange.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Get daily data for qualification rate and calls per lead
        const [dailyLeadAllocations, dailyQualifications, dailyCallCounts] = await Promise.all([
          // Daily lead allocations using Lead table createdAt
          Lead.aggregate([
            { $match: { ...agentMatchFilter, createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]),
          // Daily qualifications
          Lead.aggregate([
            { $match: { ...agentMatchFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$qualifiedDate" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ]),
          // Daily call counts
          CallLog.aggregate([
            { $match: { ...getCallFilter(), createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
          ])
        ]);

        // Calculate daily qualification rate (qualified/allocated)
        dailyQualificationRate = dateRange.map(date => {
          const allocated = dailyLeadAllocations.find(t => t._id === date)?.count || 0;
          const qualified = dailyQualifications.find(t => t._id === date)?.count || 0;
          const rate = allocated > 0 ? ((qualified / allocated) * 100).toFixed(2) : 0;
          return { date, rate: parseFloat(rate), allocated, qualified };
        });

        // Calculate daily calls per lead (calls/allocated)
        dailyCallsPerLead = dateRange.map(date => {
          const allocated = dailyLeadAllocations.find(t => t._id === date)?.count || 0;
          const calls = dailyCallCounts.find(t => t._id === date)?.count || 0;
          const ratio = allocated > 0 ? (calls / allocated).toFixed(2) : 0;
          return { date, ratio: parseFloat(ratio), calls, allocated };
        });
      } else {
        // No assigned leads, return empty arrays with dates
        const dateRange = [];
        const currentDate = new Date(chartStartDate);
        while (currentDate <= chartEndDate) {
          dateRange.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        dailyQualificationRate = dateRange.map(date => ({ date, rate: 0, allocated: 0, qualified: 0 }));
        dailyCallsPerLead = dateRange.map(date => ({ date, ratio: 0, calls: 0, allocated: 0 }));
      }
    }

    res.json({
      // Card metrics
      totalLeads, leadsMTD, leadsToday,
      totalCalls, callsMTD, callsToday,
      totalQualified, qualifiedMTD, qualifiedToday,
      totalLost, lostMTD, lostToday,
      totalWon, wonMTD, wonToday,
      // Visit and meeting metrics
      siteVisits, centerVisits, virtualMeetings,
      // Charts data
      dailyLeads, dailyCalls, dailyQualified, dailyLost, dailyWon,
      dailySiteVisits, dailyCenterVisits, dailyVirtualMeetings,
      sourceLeads, sourceQualified, sourceWon,
      // Agent-specific charts
      dailyQualificationRate, dailyCallsPerLead,
      role: userRole === 'presales_agent' ? 'presales_agent' : 'admin',
      showFilters: userRole !== 'presales_agent'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin dashboard' });
  }
});

// Get all sources for admin dashboard dropdown
router.get('/admin/sources', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    // if (!['admin', 'marketing'].includes(user?.roleId?.slug)) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    const LeadSource = require('../models/LeadSource');
    const sources = await LeadSource.find({ deletedAt: null }).select('_id name').sort({ name: 1 });
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

// Get users by type for admin dashboard
router.get('/admin/users/:type', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    // if (!['admin', 'marketing'].includes(user?.roleId?.slug)) {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    const { type } = req.params;
    let roleFilter = {};

    if (type === 'sales') {
      const salesRoles = await Role.find({ slug: { $in: ['sales_agent'] } });
      roleFilter = { roleId: { $in: salesRoles.map(r => r._id) } };
    } else if (type === 'presales') {
      const presalesRoles = await Role.find({ slug: { $in: ['presales_agent'] } });
      roleFilter = { roleId: { $in: presalesRoles.map(r => r._id) } };
    } else {
      const presalesRoles = await Role.find({ slug: { $in: ['presales_agent', 'sales_agent'] } });
      roleFilter = { roleId: { $in: presalesRoles.map(r => r._id) } };
    }

    const users = await User.find({ ...roleFilter, deletedAt: null }).select('_id name email').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});





// Marketing dashboard
router.get('/marketing', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    if (user?.roleId?.slug !== 'marketing') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalLeads, leadsToday, adLeads, campaignLeads] = await Promise.all([
      Lead.countDocuments({ deletedAt: null }),
      Lead.countDocuments({ deletedAt: null, createdAt: { $gte: startOfToday } }),
      Lead.countDocuments({ deletedAt: null, adname: { $ne: null, $ne: '' } }),
      Lead.countDocuments({ deletedAt: null, campaign: { $ne: null, $ne: '' } })
    ]);

    res.json({ totalLeads, leadsToday, adLeads, campaignLeads, role: 'marketing' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch marketing dashboard' });
  }
});

module.exports = router;