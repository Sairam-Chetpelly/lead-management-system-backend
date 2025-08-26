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
    
    // Build base filter for leads based on user role
    const getLeadFilter = async (additionalFilter = {}) => {
      let filter = { deletedAt: null, ...additionalFilter };
      
      if (userRole === 'presales_agent') {
        filter.presalesUserId = new mongoose.Types.ObjectId(req.user.userId);
        const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
        if (leadStatus) {
          filter.leadStatusId = leadStatus._id;
        }
      } else if (userRole === 'sales_agent') {
        const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
        const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
        filter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
        filter.leadStatusId = { 
          $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean)
        };
      } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
        const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
        if (leadStatus) {
          filter.leadStatusId = leadStatus._id;
        }
      } else if (userRole === 'hod_sales') {
        // HOD sales can only see leads from their center
        filter.centreId = user.centreId;
      } else if (userRole === 'sales_manager') {
        // Sales manager can only see qualified leads from their center
        filter.centreId = user.centreId;
        const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
        if (qualifiedStatus) {
          filter.leadStatusId = qualifiedStatus._id;
        }
      }
      
      return filter;
    };
    
    // Total leads
    const totalLeads = await Lead.countDocuments(await getLeadFilter());
    
    // This week leads
    const weekLeads = await Lead.countDocuments(await getLeadFilter({ createdAt: { $gte: startOfWeek } }));
    
    // Today's leads
    const todayLeads = await Lead.countDocuments(await getLeadFilter({ createdAt: { $gte: startOfToday } }));
    
    // Today's calls (filter by user for presales and sales agents)
    let callFilter = { deletedAt: null, createdAt: { $gte: startOfToday } };
    if (userRole === 'presales_agent' || userRole === 'sales_agent') {
      callFilter.userId = new mongoose.Types.ObjectId(req.user.userId);
    }
    const todayCalls = await CallLog.countDocuments(callFilter);
    
    // Won leads - don't apply role filters for won/lost counts
    const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
    const wonLeads = wonStatus ? await Lead.countDocuments({ deletedAt: null, leadStatusId: wonStatus._id }) : 0;
    
    // Lost leads - don't apply role filters for won/lost counts
    const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
    const lostLeads = lostStatus ? await Lead.countDocuments({ deletedAt: null, leadStatusId: lostStatus._id }) : 0;
    
    // Weekly lead trend (last 7 days)
    const weeklyTrend = [];
    const weeklyCallTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayLeadCount = await Lead.countDocuments(await getLeadFilter({
        createdAt: { $gte: date, $lt: nextDate }
      }));
      
      // Daily call count for presales and sales agents
      let dayCallFilter = { deletedAt: null, createdAt: { $gte: date, $lt: nextDate } };
      if (userRole === 'presales_agent' || userRole === 'sales_agent') {
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
    
    // Status distribution
    const statusPipeline = [
      { $match: await getLeadFilter() },
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
      { $match: await getLeadFilter() },
      { $group: { _id: '$leadValue', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ];
    
    const valueResults = await Lead.aggregate(valuePipeline);
    const leadValueDistribution = valueResults.map(item => ({
      _id: item._id || 'Not Set',
      count: item.count
    }));
    
    // Source-wise lead distribution
    const sourcePipeline = [
      { $match: await getLeadFilter() },
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
      { $match: await getLeadFilter() },
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
      { $match: await getLeadFilter() },
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
    if (userRole === 'sales_agent' || userRole === 'admin' || userRole === 'hod_sales' || userRole === 'manager_sales') {
      let subStatusFilter = { deletedAt: null };
      
      if (userRole === 'sales_agent') {
        const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
        const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
        subStatusFilter.salesUserId = new mongoose.Types.ObjectId(req.user.userId);
        subStatusFilter.leadStatusId = { $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean) };
      }
      
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
      
      const activeStatus = await Status.findOne({ slug: 'active', type: 'status' });
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
      
      const activeStatus = await Status.findOne({ slug: 'active', type: 'status' });
      activeUsers = activeStatus ? await User.countDocuments({ 
        deletedAt: null,
        centreId: user.centreId,
        statusId: activeStatus._id
      }) : 0;
    } else {
      // Show all users for other roles
      totalUsers = await User.countDocuments({ deletedAt: null });
      const activeStatus = await Status.findOne({ slug: 'active', type: 'status' });
      activeUsers = activeStatus ? await User.countDocuments({ 
        deletedAt: null,
        statusId: activeStatus._id
      }) : 0;
    }
    
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

module.exports = router;