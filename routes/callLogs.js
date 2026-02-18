const express = require('express');
const CallLog = require('../models/CallLog');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const router = express.Router();

// Get call logs with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { deletedAt: null };
    
    // Date range filters
    if (req.query.startDate && req.query.endDate) {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      filter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
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

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { callId: searchRegex }
      ];
    }

    // Get call logs with user and lead details
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
});

module.exports = router;
