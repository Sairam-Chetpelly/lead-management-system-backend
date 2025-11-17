const express = require('express');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
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

// Export lead activities
router.get('/export', authenticateToken, async (req, res) => {
  try {
    // Get user role for filtering (same logic as main endpoint)
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    // Build filter (same as main endpoint)
    const filter = { deletedAt: null };
    
    // Role-based filtering (similar to leads export)
    if (userRole === 'presales_agent') {
      filter.$or = [
        { presalesUserId: req.user.userId },
        { updatedPerson: req.user.userId }
      ];
    } else if (userRole === 'sales_agent') {
      filter.$or = [
        { salesUserId: req.user.userId },
        { updatedPerson: req.user.userId }
      ];
    } else if (userRole === 'hod_sales' || userRole === 'sales_manager') {
      // HOD sales and sales manager can see activities from their center
      if (user.centreId) {
        filter.centreId = user.centreId;
      }
    }
    
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

    // Get all lead activities for export (no pagination)
    const leadActivities = await LeadActivity.find(filter)
      .populate('leadId', 'leadID name contactNumber')
      .populate('presalesUserId', 'name email')
      .populate('salesUserId', 'name email')
      .populate('updatedPerson', 'name email')
      .populate('sourceId', 'name')
      .populate('leadStatusId', 'name slug')
      .populate('leadSubStatusId', 'name slug')
      .populate('languageId', 'name')
      .populate('centreId', 'name')
      .populate('projectTypeId', 'name type')
      .populate('houseTypeId', 'name type')
      .sort({ createdAt: -1 });

    // Helper function to clean text for CSV
    const cleanTextForCSV = (text) => {
      if (!text) return '';
      return String(text).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    };

    // Format data for CSV export (using same format as leads export)
    const csvData = leadActivities.map(activity => ({
      'Lead ID': activity.leadId?.leadID || '',
      'Activity ID': activity._id.toString(),
      'Name': cleanTextForCSV(activity.name),
      'Email': activity.email || '',
      'Contact Number': activity.contactNumber || '',
      'Source': activity.sourceId?.name || '',
      'Centre': activity.centreId?.name || '',
      'Presales Agent': activity.presalesUserId?.name || '',
      'Sales Agent': activity.salesUserId?.name || '',
      'Lead Status': activity.leadStatusId?.name || '',
      'Lead Sub Status': activity.leadSubStatusId?.name || '',
      'Lead Value': activity.leadValue || '',
      'Language': activity.languageId?.name || '',
      'Project Type': activity.projectTypeId?.name || '',
      'House Type': activity.houseTypeId?.name || '',
      'Project Value': cleanTextForCSV(activity.projectValue),
      'Apartment Name': cleanTextForCSV(activity.apartmentName),
      'Expected Possession Date': activity.expectedPossessionDate ? new Date(activity.expectedPossessionDate).toLocaleDateString() : '',
      'Site Visit': activity.siteVisit ? 'Yes' : 'No',
      'Site Visit Date': activity.siteVisitDate ? new Date(activity.siteVisitDate).toLocaleDateString() : '',
      'Site Visit Completed Date': activity.siteVisitCompletedDate ? new Date(activity.siteVisitCompletedDate).toLocaleDateString() : '',
      'Center Visit': activity.centerVisit ? 'Yes' : 'No',
      'Center Visit Date': activity.centerVisitDate ? new Date(activity.centerVisitDate).toLocaleDateString() : '',
      'Center Visit Completed Date': activity.centerVisitCompletedDate ? new Date(activity.centerVisitCompletedDate).toLocaleDateString() : '',
      'Virtual Meeting': activity.virtualMeeting ? 'Yes' : 'No',
      'Virtual Meeting Date': activity.virtualMeetingDate ? new Date(activity.virtualMeetingDate).toLocaleDateString() : '',
      'Virtual Meeting Completed Date': activity.virtualMeetingCompletedDate ? new Date(activity.virtualMeetingCompletedDate).toLocaleDateString() : '',
      'CIF Date': activity.cifDate ? new Date(activity.cifDate).toLocaleDateString() : '',
      'Meeting Arranged Date': activity.meetingArrangedDate ? new Date(activity.meetingArrangedDate).toLocaleDateString() : '',
      'Qualified Date': activity.qualifiedDate ? new Date(activity.qualifiedDate).toLocaleDateString() : '',
      'Hot Date': activity.hotDate ? new Date(activity.hotDate).toLocaleDateString() : '',
      'Warm Date': activity.warmDate ? new Date(activity.warmDate).toLocaleDateString() : '',
      'Interested Date': activity.interestedDate ? new Date(activity.interestedDate).toLocaleDateString() : '',
      'Won Date': activity.leadWonDate ? new Date(activity.leadWonDate).toLocaleDateString() : '',
      'Lost Date': activity.leadLostDate ? new Date(activity.leadLostDate).toLocaleDateString() : '',
      'Comment': cleanTextForCSV(activity.comment),
      'Out of Station': activity.outOfStation ? 'Yes' : 'No',
      'Requirement Within Two Months': activity.requirementWithinTwoMonths ? 'Yes' : 'No',
      'Ad Name': cleanTextForCSV(activity?.adname) || '',
      'Ad Set': cleanTextForCSV(activity?.adset) || '',
      'Ad Campaign': cleanTextForCSV(activity?.campaign) || '',
      'CP User Name': cleanTextForCSV(activity?.cpUserName) || '',
      'Updated By': activity.updatedPerson?.name || '',
      'Created At': new Date(activity.createdAt).toLocaleString(),
      'Updated At': new Date(activity.updatedAt).toLocaleString()
    }));

    res.json(csvData);
  } catch (error) {
    console.error('Error exporting lead activities:', error);
    res.status(500).json({ error: 'Failed to export lead activities' });
  }
});

module.exports = router;