const express = require('express');
const LeadActivity = require('../models/LeadActivity');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get lead activities with pagination and filters
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
      filter.$or = [
        { presalesUserId: req.query.userId },
        { salesUserId: req.query.userId },
        { updatedPerson: req.query.userId }
      ];
    }

    // Search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex },
        { comment: searchRegex }
      ];
    }

    // Get lead activities with populated references
    const [leadActivities, total] = await Promise.all([
      LeadActivity.find(filter)
        .populate('leadId', 'leadID name contactNumber')
        .populate('presalesUserId', 'name email')
        .populate('salesUserId', 'name email')
        .populate('updatedPerson', 'name email')
        .populate('sourceId', 'name')
        .populate('leadStatusId', 'name slug')
        .populate('leadSubStatusId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LeadActivity.countDocuments(filter)
    ]);

    res.json({
      leadActivities,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching lead activities:', error);
    res.status(500).json({ error: 'Failed to fetch lead activities' });
  }
});

module.exports = router;