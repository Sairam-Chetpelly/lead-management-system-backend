const CallLog = require('../models/CallLog');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { deletedAt: null };
    
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    } else if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $lte: endDate };
    }
    
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [{ callId: searchRegex }];
    }

    const [callLogs, total] = await Promise.all([
      CallLog.find(filter)
        .populate('userId', 'name email')
        .populate('leadId', 'name contactNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CallLog.countDocuments(filter)
    ]);

    return successResponse(res, {
      callLogs,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Call logs retrieved successfully', 200);
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return errorResponse(res, 'Failed to fetch call logs', 500);
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    const filter = { deletedAt: null };

    if (userRole === 'presales_agent' || userRole === 'sales_agent') {
      filter.userId = req.user.userId;
    } else if (userRole === 'hod_sales' || userRole === 'sales_manager') {
      if (user.centreId) {
        const Lead = require('../models/Lead');
        const centerLeads = await Lead.find({ centreId: user.centreId, deletedAt: null }).select('_id');
        filter.leadId = { $in: centerLeads.map(l => l._id) };
      }
    }

    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    } else if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $lte: endDate };
    }

    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [{ callId: searchRegex }];
    }

    const callLogs = await CallLog.find(filter)
      .populate('userId', 'name email')
      .populate('leadId', 'leadID name contactNumber email')
      .sort({ createdAt: -1 });

    const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
    const cleanText = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,/g, '|')
        .trim();
    };

    const csvRows = [];
    csvRows.push('Call ID,Lead ID,Lead Name,Lead Contact,Lead Email,User Name,User Email,Call Date Time,Created At');

    for (const log of callLogs) {
      csvRows.push(`${cleanText(log._id)},${cleanText(log.leadId?.leadID)},${cleanText(log.leadId?.name)},${cleanText(log.leadId?.contactNumber)},${cleanText(log.leadId?.email)},${cleanText(log.userId?.name)},${cleanText(log.userId?.email)},${formatDate(log.dateTime)},${formatDate(log.createdAt)}`);
    }

    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=call-logs.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting call logs:', error);
    return errorResponse(res, 'Failed to export call logs', 500);
  }
};
