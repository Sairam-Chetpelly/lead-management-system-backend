const LeadActivity = require('../models/LeadActivity');
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
      filter.$or = [
        { presalesUserId: req.query.userId },
        { salesUserId: req.query.userId },
        { updatedPerson: req.query.userId }
      ];
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex },
        { comment: searchRegex }
      ];
    }

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

    return successResponse(res, {
      leadActivities,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Lead activities retrieved successfully', 200);
  } catch (error) {
    console.error('Error fetching lead activities:', error);
    return errorResponse(res, 'Failed to fetch lead activities', 500);
  }
};

exports.exportCSV = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    const filter = { deletedAt: null };

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
      if (user.centreId) filter.centreId = user.centreId;
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
      filter.$or = [
        { presalesUserId: req.query.userId },
        { salesUserId: req.query.userId },
        { updatedPerson: req.query.userId }
      ];
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex },
        { comment: searchRegex }
      ];
    }

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

    const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
    const formatBoolean = (val) => val === true ? 'Yes' : val === false ? 'No' : '';
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
    csvRows.push('Lead ID,Activity ID,Name,Email,Contact Number,Source,Centre,Presales Agent,Sales Agent,Lead Status,Lead Sub Status,Lead Value,Language,Project Type,House Type,Project Value,Apartment Name,Expected Possession Date,Site Visit,Site Visit Date,Site Visit Completed Date,Lead Closure,Lead Closure Date,Center Visit,Center Visit Date,Center Visit Completed Date,Virtual Meeting,Virtual Meeting Date,Virtual Meeting Completed Date,CIF Date,Meeting Arranged Date,Qualified Date,Hot Date,Warm Date,Interested Date,Won Date,Lost Date,Comment,Out of Station,Requirement Within Two Months,Ad Name,Ad Set,Ad Campaign,CP User Name,Updated By,Created At,Updated At');

    for (const activity of leadActivities) {
      csvRows.push(`${cleanText(activity.leadId?.leadID)},${cleanText(activity._id)},${cleanText(activity.name)},${cleanText(activity.email)},${cleanText(activity.contactNumber)},${cleanText(activity.sourceId?.name)},${cleanText(activity.centreId?.name)},${cleanText(activity.presalesUserId?.name)},${cleanText(activity.salesUserId?.name)},${cleanText(activity.leadStatusId?.name)},${cleanText(activity.leadSubStatusId?.name)},${cleanText(activity.leadValue)},${cleanText(activity.languageId?.name)},${cleanText(activity.projectTypeId?.name)},${cleanText(activity.houseTypeId?.name)},${cleanText(activity.projectValue)},${cleanText(activity.apartmentName)},${formatDate(activity.expectedPossessionDate)},${formatBoolean(activity.siteVisit)},${formatDate(activity.siteVisitDate)},${formatDate(activity.siteVisitCompletedDate)},${formatBoolean(activity.leadClosure)},${formatDate(activity.leadClosureDate)},${formatBoolean(activity.centerVisit)},${formatDate(activity.centerVisitDate)},${formatDate(activity.centerVisitCompletedDate)},${formatBoolean(activity.virtualMeeting)},${formatDate(activity.virtualMeetingDate)},${formatDate(activity.virtualMeetingCompletedDate)},${formatDate(activity.cifDate)},${formatDate(activity.meetingArrangedDate)},${formatDate(activity.qualifiedDate)},${formatDate(activity.hotDate)},${formatDate(activity.warmDate)},${formatDate(activity.interestedDate)},${formatDate(activity.leadWonDate)},${formatDate(activity.leadLostDate)},${cleanText(activity.comment)},${formatBoolean(activity.outOfStation)},${formatBoolean(activity.requirementWithinTwoMonths)},${cleanText(activity.adname)},${cleanText(activity.adset)},${cleanText(activity.campaign)},${cleanText(activity.cpUserName)},${cleanText(activity.updatedPerson?.name)},${formatDate(activity.createdAt)},${formatDate(activity.updatedAt)}`);
    }

    const csvContent = csvRows.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=lead-activities_${timestamp}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting lead activities:', error);
    return errorResponse(res, 'Failed to export lead activities', 500);
  }
};
