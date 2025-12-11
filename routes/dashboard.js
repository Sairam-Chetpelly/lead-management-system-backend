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

// Admin dashboard
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    let { userType, agentId, startDate, endDate, sourceId, centreId } = req.query;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date();
    startOfToday.setHours(5, 30, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Auto-set filters for different user roles
    if (userRole === 'presales_agent') {
      userType = 'presales';
      agentId = req.user.userId;
    } else if (userRole === 'manager_presales' || userRole === 'hod_presales') {
      userType = 'presales';
      // Don't set agentId - show all presales leads by default
    } else if (userRole === 'sales_agent') {
      userType = 'sales';
      agentId = req.user.userId;
    } else if (userRole === 'sales_manager' || userRole === 'hod_sales') {
      userType = 'sales';
    }

    // Build filters
    const leadFilter = { deletedAt: null };
    const callFilter = { deletedAt: null };
    
    // Apply centre filter for sales_manager and hod_sales
    if (userRole === 'sales_manager' && user.centreId) {
      leadFilter.centreId = user.centreId;
    } else if (['hod_sales', 'admin', 'marketing'].includes(userRole)) {
      if (centreId && centreId !== 'all') {
        leadFilter.centreId = new mongoose.Types.ObjectId(centreId);
      }
      // If no centreId provided, show all data (no filter applied)
    }
    
    // For call counts, filter by user type when not filtering by specific agent
    if (!agentId || agentId === 'all') {
      if (userType === 'sales') {
        const salesRoleIds = await Role.find({ 
          slug: { $in: ['sales_agent', 'sales_manager', 'hod_sales'] } 
        }).distinct('_id');
        
        if (salesRoleIds.length > 0) {
          const salesUserQuery = { 
            roleId: { $in: salesRoleIds },
            deletedAt: null 
          };
          
          // Filter by centre for sales_manager and hod_sales
          if (userRole === 'sales_manager' && user.centreId) {
            salesUserQuery.centreId = user.centreId;
          } else if (['hod_sales', 'admin', 'marketing'].includes(userRole) && centreId && centreId !== 'all') {
            salesUserQuery.centreId = new mongoose.Types.ObjectId(centreId);
          }
          
          const salesUserIds = await User.find(salesUserQuery).distinct('_id');
          
          if (salesUserIds.length > 0) {
            callFilter.userId = { $in: salesUserIds };
          }
        }
      } else if (userType === 'presales') {
        const presalesRoleIds = await Role.find({ 
          slug: { $in: ['presales_agent', 'manager_presales', 'hod_presales'] } 
        }).distinct('_id');
        
        if (presalesRoleIds.length > 0) {
          const presalesUserQuery = { 
            roleId: { $in: presalesRoleIds },
            deletedAt: null 
          };
          
          // Filter by centre for presales users when center is selected
          if (['hod_sales', 'admin', 'marketing'].includes(userRole) && centreId && centreId !== 'all') {
            presalesUserQuery.centreId = new mongoose.Types.ObjectId(centreId);
          }
          
          const presalesUserIds = await User.find(presalesUserQuery).distinct('_id');
          
          if (presalesUserIds.length > 0) {
            callFilter.userId = { $in: presalesUserIds };
          }
        }
      } else {
        // When no userType is selected but center is selected, filter all users by center
        if (['hod_sales', 'admin', 'marketing'].includes(userRole) && centreId && centreId !== 'all') {
          const centerUserIds = await User.find({ 
            centreId: new mongoose.Types.ObjectId(centreId),
            deletedAt: null 
          }).distinct('_id');
          
          if (centerUserIds.length > 0) {
            callFilter.userId = { $in: centerUserIds };
          }
        }
      }
    }

    // Apply agent filter
    if (agentId && agentId !== 'all') {
      if (userType === 'sales') {
        leadFilter.salesUserId = new mongoose.Types.ObjectId(agentId);
      } else if (userType === 'presales') {
        leadFilter.presalesUserId = new mongoose.Types.ObjectId(agentId);
      } else {
        leadFilter.$or = [{ salesUserId: agentId }, { presalesUserId: agentId }];
      }
      callFilter.userId = new mongoose.Types.ObjectId(agentId);
    }

    // Apply source filter
    if (sourceId && sourceId !== 'all') {
      leadFilter.sourceId = new mongoose.Types.ObjectId(sourceId);
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

    // Build date filters
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

    const mtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };
    const qualifiedMtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };
    const lostMtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };
    const wonMtdFilter = startDate && endDate ? createdAtFilter : { $gte: startOfMonth };

    // Build lost filter based on user type
    const getLostFilter = (dateFilter = {}) => {
      const lostFilter = { ...leadFilter, leadStatusId: lostStatus?._id, ...dateFilter };
      if (userType === 'presales') {
        lostFilter.qualifiedDate = null;
      } else if (userType === 'sales') {
        lostFilter.qualifiedDate = { $ne: null };
      }
      return lostFilter;
    };

    // Get all counts using Lead table only
    const [totalLeads, leadsMTD, leadsToday, totalQualified, qualifiedMTD, qualifiedToday, totalLost, lostMTD, lostToday, totalWon, wonMTD, wonToday] = await Promise.all([
      // Total leads
      Lead.countDocuments({ ...leadFilter, ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}) }),
      Lead.countDocuments({ ...leadFilter, createdAt: mtdFilter }),
      Lead.countDocuments({ ...leadFilter, createdAt: { $gte: startOfToday, $lte: endOfToday } }),
      // Qualified leads
      Lead.countDocuments({ ...leadFilter, leadStatusId: qualifiedStatus?._id, ...(Object.keys(createdAtFilter).length ? { qualifiedDate: createdAtFilter } : {}) }),
      Lead.countDocuments({ ...leadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: qualifiedMtdFilter }),
      Lead.countDocuments({ ...leadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: startOfToday, $lte: endOfToday } }),
      // Lost leads (with qualifiedDate null condition for presales)
      Lead.countDocuments(getLostFilter(Object.keys(createdAtFilter).length ? { leadLostDate: createdAtFilter } : {})),
      Lead.countDocuments(getLostFilter({ leadLostDate: lostMtdFilter })),
      Lead.countDocuments(getLostFilter({ leadLostDate: { $gte: startOfToday, $lte: endOfToday } })),
      // Won leads
      Lead.countDocuments({ ...leadFilter, leadStatusId: wonStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadWonDate: createdAtFilter } : {}) }),
      Lead.countDocuments({ ...leadFilter, leadStatusId: wonStatus?._id, leadWonDate: wonMtdFilter }),
      Lead.countDocuments({ ...leadFilter, leadStatusId: wonStatus?._id, leadWonDate: { $gte: startOfToday, $lte: endOfToday } })
    ]);

    // Get call counts
    const [totalCalls, callsMTD, callsToday] = await Promise.all([
      CallLog.countDocuments({ ...callFilter, ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}) }),
      CallLog.countDocuments({ ...callFilter, createdAt: mtdFilter }),
      CallLog.countDocuments({ ...callFilter, createdAt: { $gte: startOfToday, $lte: endOfToday } })
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

    // Use aggregation for daily trends
    const [leadTrends, callTrends, qualifiedTrends, lostTrends, wonTrends] = await Promise.all([
      Lead.aggregate([
        { $match: { ...leadFilter, createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      CallLog.aggregate([
        { $match: { ...callFilter, createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([
        { $match: { ...leadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$qualifiedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([
        { $match: getLostFilter({ leadLostDate: { $gte: chartStartDate, $lte: chartEndDate } }) },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$leadLostDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([
        { $match: { ...leadFilter, leadStatusId: wonStatus?._id, leadWonDate: { $gte: chartStartDate, $lte: chartEndDate } } },
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

    const dailyLeads = dateRange.map(date => ({ date, count: leadTrends.find(t => t._id === date)?.count || 0 }));
    const dailyCalls = dateRange.map(date => ({ date, count: callTrends.find(t => t._id === date)?.count || 0 }));
    const dailyQualified = dateRange.map(date => ({ date, count: qualifiedTrends.find(t => t._id === date)?.count || 0 }));
    const dailyLost = dateRange.map(date => ({ date, count: lostTrends.find(t => t._id === date)?.count || 0 }));
    const dailyWon = dateRange.map(date => ({ date, count: wonTrends.find(t => t._id === date)?.count || 0 }));

    // Source-wise data using Lead table
    const [sourceLeads, sourceQualified, sourceWon] = await Promise.all([
      Lead.aggregate([
        { $match: { ...leadFilter, ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}) } },
        { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
        { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
        { $group: { _id: '$sourceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Lead.aggregate([
        { $match: { ...leadFilter, qualifiedDate: { $ne: null }, ...(Object.keys(createdAtFilter).length ? { qualifiedDate: createdAtFilter } : {}) } },
        { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
        { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
        { $group: { _id: '$sourceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Lead.aggregate([
        { $match: { ...leadFilter, leadStatusId: wonStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadWonDate: createdAtFilter } : {}) } },
        { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
        { $addFields: { sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } } } },
        { $group: { _id: '$sourceName', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    // Visit and meeting data
    const [siteVisits, centerVisits, virtualMeetings] = await Promise.all([
      Lead.countDocuments({ ...leadFilter, siteVisit: true, ...(Object.keys(createdAtFilter).length ? { siteVisitCompletedDate: createdAtFilter } : {}) }),
      Lead.countDocuments({ ...leadFilter, centerVisit: true, ...(Object.keys(createdAtFilter).length ? { centerVisitCompletedDate: createdAtFilter } : {}) }),
      Lead.countDocuments({ ...leadFilter, virtualMeeting: true, ...(Object.keys(createdAtFilter).length ? { virtualMeetingCompletedDate: createdAtFilter } : {}) })
    ]);

    // Daily visit and meeting trends using aggregation
    const [siteVisitTrends, centerVisitTrends, virtualMeetingTrends] = await Promise.all([
      Lead.aggregate([
        { $match: { ...leadFilter, siteVisit: true, siteVisitCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$siteVisitCompletedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([
        { $match: { ...leadFilter, centerVisit: true, centerVisitCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$centerVisitCompletedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Lead.aggregate([
        { $match: { ...leadFilter, virtualMeeting: true, virtualMeetingCompletedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$virtualMeetingCompletedDate" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const dailySiteVisits = dateRange.map(date => ({ date, count: siteVisitTrends.find(t => t._id === date)?.count || 0 }));
    const dailyCenterVisits = dateRange.map(date => ({ date, count: centerVisitTrends.find(t => t._id === date)?.count || 0 }));
    const dailyVirtualMeetings = dateRange.map(date => ({ date, count: virtualMeetingTrends.find(t => t._id === date)?.count || 0 }));

    // Additional charts for agent filters
    let dailyQualificationRate = [], dailyCallsPerLead = [];

    if (userType === 'presales' || userType === 'sales') {
      // Get daily data for qualification rate and calls per lead
      const [dailyLeadAllocations, dailyQualifications, dailyCallCounts] = await Promise.all([
        Lead.aggregate([
          { $match: { ...leadFilter, createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        Lead.aggregate([
          { $match: { ...leadFilter, leadStatusId: qualifiedStatus?._id, qualifiedDate: { $gte: chartStartDate, $lte: chartEndDate } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$qualifiedDate" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        CallLog.aggregate([
          { $match: { ...callFilter, createdAt: { $gte: chartStartDate, $lte: chartEndDate } } },
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
    }

    // Center-wise won leads and project value (for admin and marketing only)
    let centerWonData = [], sourceCenterData = [];
    if (['admin', 'marketing'].includes(userRole)) {
      try {
        // Get center-wise won leads with project value
        centerWonData = await Lead.aggregate([
          { $match: { ...leadFilter, leadStatusId: wonStatus?._id, ...(Object.keys(createdAtFilter).length ? { leadWonDate: createdAtFilter } : {}) } },
          { $lookup: { from: 'centres', localField: 'centreId', foreignField: '_id', as: 'centre' } },
          { $addFields: { 
            centreName: { $cond: { if: { $gt: [{ $size: '$centre' }, 0] }, then: { $arrayElemAt: ['$centre.name', 0] }, else: 'Unknown' } },
            numericProjectValue: {
              $cond: {
                if: { $and: [{ $ne: ['$projectValue', null] }, { $ne: ['$projectValue', ''] }] },
                then: { $convert: { input: '$projectValue', to: 'double', onError: 0 } },
                else: 0
              }
            }
          }},
          { $group: { _id: '$centreName', wonCount: { $sum: 1 }, totalValue: { $sum: '$numericProjectValue' } } },
          { $sort: { wonCount: -1 } }
        ]);

        // Get source/center matrix data for qualified leads only
        sourceCenterData = await Lead.aggregate([
          { $match: { ...leadFilter, qualifiedDate: { $ne: null }, ...(Object.keys(createdAtFilter).length ? { qualifiedDate: createdAtFilter } : {}) } },
          { $lookup: { from: 'leadsources', localField: 'sourceId', foreignField: '_id', as: 'source' } },
          { $lookup: { from: 'centres', localField: 'centreId', foreignField: '_id', as: 'centre' } },
          { $addFields: { 
            sourceName: { $cond: { if: { $gt: [{ $size: '$source' }, 0] }, then: { $arrayElemAt: ['$source.name', 0] }, else: 'Unknown' } },
            centreName: { $cond: { if: { $gt: [{ $size: '$centre' }, 0] }, then: { $arrayElemAt: ['$centre.name', 0] }, else: 'Unknown' } }
          }},
          { $group: { _id: { source: '$sourceName', centre: '$centreName' }, count: { $sum: 1 } } },
          { $sort: { '_id.source': 1, '_id.centre': 1 } }
        ]);
      } catch (error) {
        console.error('Error in new aggregations:', error);
        centerWonData = [];
        sourceCenterData = [];
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
      // New tables for admin and marketing
      centerWonData, sourceCenterData,
      role: userRole,
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

// Get all centres for admin dashboard dropdown
router.get('/admin/centres', authenticateToken, async (req, res) => {
  try {
    const Centre = require('../models/Centre');
    const centres = await Centre.find({ deletedAt: null }).select('_id name').sort({ name: 1 });
    res.json(centres);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch centres' });
  }
});

// Export dashboard data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const dashboardReq = { ...req, url: '/api/dashboard/admin', query: req.query };
    const dashboardRes = { json: (data) => data };
    
    const adminHandler = router.stack.find(r => r.route?.path === '/admin')?.route?.stack[0]?.handle;
    const data = await new Promise((resolve) => {
      const mockRes = { json: resolve, status: () => mockRes };
      adminHandler(req, mockRes, () => {});
    });

    const csv = [
      ['Metric', 'Value'],
      ['Total Leads', data.totalLeads],
      ['Leads MTD', data.leadsMTD],
      ['Leads Today', data.leadsToday],
      ['Total Calls', data.totalCalls],
      ['Calls MTD', data.callsMTD],
      ['Calls Today', data.callsToday],
      ['Total Qualified', data.totalQualified],
      ['Qualified MTD', data.qualifiedMTD],
      ['Qualified Today', data.qualifiedToday],
      ['Total Lost', data.totalLost],
      ['Lost MTD', data.lostMTD],
      ['Lost Today', data.lostToday],
      ['Total Won', data.totalWon],
      ['Won MTD', data.wonMTD],
      ['Won Today', data.wonToday],
      ['Site Visits', data.siteVisits],
      ['Center Visits', data.centerVisits],
      ['Virtual Meetings', data.virtualMeetings],
      [''],
      ['Daily Leads'],
      ['Date', 'Count'],
      ...data.dailyLeads.map(d => [d.date, d.count]),
      [''],
      ['Daily Calls'],
      ['Date', 'Count'],
      ...data.dailyCalls.map(d => [d.date, d.count]),
      [''],
      ['Source Wise Leads'],
      ['Source', 'Count'],
      ...data.sourceLeads.map(s => [s._id, s.count]),
      [''],
      ['Source Wise Qualified'],
      ['Source', 'Count'],
      ...data.sourceQualified.map(s => [s._id, s.count]),
      [''],
      ['Center Won Leads'],
      ['Center', 'Won Count', 'Project Value'],
      ...data.centerWonData.map(c => [c._id, c.wonCount, c.totalValue]),
      [''],
      ['Source/Center Qualified Distribution'],
      ['Source', 'Center', 'Count'],
      ...data.sourceCenterData.map(sc => [sc._id.source, sc._id.centre, sc.count])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Get users by type for admin dashboard
router.get('/admin/users/:type', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
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

    // Apply centre filter for sales_manager
    if (userRole === 'sales_manager' && user.centreId) {
      roleFilter.centreId = user.centreId;
    }

    const users = await User.find({ ...roleFilter, deletedAt: null }).select('_id name email').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;