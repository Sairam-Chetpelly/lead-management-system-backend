const Lead = require('../models/Lead');
const User = require('../models/User');
const Status = require('../models/Status');
const CallLog = require('../models/CallLog');
const ActivityLog = require('../models/ActivityLog');
const LeadActivity = require('../models/LeadActivity');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { successResponse, errorResponse } = require('../utils/response');

// Configure multer for recording uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/recordings');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for recordings
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(mp3|wav|m4a|aac|ogg|webm|mp4)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio/video files are allowed for recordings'));
    }
  }
});

// Export leads to CSV
exports.exportCSV = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    const filter = { deletedAt: null };

    // Apply role-based filtering
    if (userRole === 'presales_agent') {
      filter.presalesUserId = req.user.userId;
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) filter.leadStatusId = leadStatus._id;
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      filter.salesUserId = req.user.userId;
      if (wonStatus || lostStatus) {
        filter.leadStatusId = { $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean) };
      }
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) filter.leadStatusId = leadStatus._id;
    } else if (userRole === 'sales_manager') {
      filter.centreId = user.centreId;
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (qualifiedStatus) filter.leadStatusId = qualifiedStatus._id;
    }

    // Apply all filters from query params
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { leadID: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    if (req.query.source) filter.sourceId = req.query.source;
    if (req.query.leadValue) filter.leadValue = req.query.leadValue;
    if (req.query.centre) filter.centreId = req.query.centre;
    if (req.query.assignedTo) {
      filter.$and = [
        {
          $or: [
            { presalesUserId: req.query.assignedTo },
            { salesUserId: req.query.assignedTo }
          ]
        }
      ];
    }
    if (req.query.leadStatus) filter.leadStatusId = req.query.leadStatus;
    if (req.query.leadSubStatus) filter.leadSubStatusId = req.query.leadSubStatus;
    if (req.query.siteVisit) filter.siteVisit = req.query.siteVisit === 'true';
    if (req.query.centerVisit) filter.centerVisit = req.query.centerVisit === 'true';
    if (req.query.virtualMeeting) filter.virtualMeeting = req.query.virtualMeeting === 'true';
    if (req.query.leadClosure) filter.leadClosure = req.query.leadClosure === 'true';
    if (req.query.outOfStation) filter.outOfStation = req.query.outOfStation === 'true';
    if (req.query.requirementWithinTwoMonths) filter.requirementWithinTwoMonths = req.query.requirementWithinTwoMonths === 'true';
    if (req.query.adname) filter.adname = new RegExp(req.query.adname, 'i');
    if (req.query.adset) filter.adset = new RegExp(req.query.adset, 'i');
    if (req.query.campaign) filter.campaign = new RegExp(req.query.campaign, 'i');

    // Date range filters
    if (req.query.dateFrom || req.query.dateTo) {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom + 'T00:00:00.000Z') : null;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo + 'T23:59:59.999Z') : null;
      const hasActivityFilters = req.query.siteVisit === 'true' || req.query.centerVisit === 'true' || req.query.virtualMeeting === 'true' || req.query.leadClosure === 'true';

      if (hasActivityFilters) {
        const activityDateConditions = [];
        if (req.query.siteVisit === 'true') {
          const siteVisitCondition = {};
          if (dateFrom) siteVisitCondition.$gte = dateFrom;
          if (dateTo) siteVisitCondition.$lte = dateTo;
          if (Object.keys(siteVisitCondition).length > 0) {
            activityDateConditions.push({ siteVisitDate: siteVisitCondition });
          }
        }
        if (req.query.centerVisit === 'true') {
          const centerVisitCondition = {};
          if (dateFrom) centerVisitCondition.$gte = dateFrom;
          if (dateTo) centerVisitCondition.$lte = dateTo;
          if (Object.keys(centerVisitCondition).length > 0) {
            activityDateConditions.push({ centerVisitDate: centerVisitCondition });
          }
        }
        if (req.query.virtualMeeting === 'true') {
          const virtualMeetingCondition = {};
          if (dateFrom) virtualMeetingCondition.$gte = dateFrom;
          if (dateTo) virtualMeetingCondition.$lte = dateTo;
          if (Object.keys(virtualMeetingCondition).length > 0) {
            activityDateConditions.push({ virtualMeetingDate: virtualMeetingCondition });
          }
        }
        if (req.query.leadClosure === 'true') {
          const leadClosureCondition = {};
          if (dateFrom) leadClosureCondition.$gte = dateFrom;
          if (dateTo) leadClosureCondition.$lte = dateTo;
          if (Object.keys(leadClosureCondition).length > 0) {
            activityDateConditions.push({ leadClosureDate: leadClosureCondition });
          }
        }
        if (activityDateConditions.length > 0) {
          filter.$or = filter.$or ? [...filter.$or, ...activityDateConditions] : activityDateConditions;
        }
      } else {
        let dateField = 'createdAt';
        if (req.query.leadStatus) {
          const selectedStatus = await Status.findById(req.query.leadStatus);
          if (selectedStatus?.slug === 'qualified') dateField = 'qualifiedDate';
          else if (selectedStatus?.slug === 'won') dateField = 'leadWonDate';
          else if (selectedStatus?.slug === 'lost') dateField = 'leadLostDate';
        }
        if (req.query.leadSubStatus) {
          const selectedSubStatus = await Status.findById(req.query.leadSubStatus);
          if (selectedSubStatus?.slug === 'hot') dateField = 'hotDate';
          else if (selectedSubStatus?.slug === 'warm') dateField = 'warmDate';
          else if (selectedSubStatus?.slug === 'interested') dateField = 'interestedDate';
          else if (selectedSubStatus?.slug === 'cif') dateField = 'cifDate';
          else if (selectedSubStatus?.slug === 'meeting-arranged') dateField = 'meetingArrangedDate';
        }
        const dateCondition = {};
        if (dateFrom) dateCondition.$gte = dateFrom;
        if (dateTo) dateCondition.$lte = dateTo;
        if (Object.keys(dateCondition).length > 0) {
          filter[dateField] = dateCondition;
        }
      }
    }

    // Handle sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const leads = await Lead.find(filter)
      .populate([
        { path: 'presalesUserId', select: 'name email' },
        { path: 'salesUserId', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name' },
        { path: 'leadSubStatusId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' }
      ])
      .sort(sortObj);

    const csvRows = [];
    csvRows.push('Lead ID,Name,Email,Contact Number,Language,Source,Centre,Presales Agent,Sales Agent,Lead Status,Lead Sub Status,Lead Value,Project Type,Project Value,Apartment Name,House Type,Expected Possession Date,Site Visit,Site Visit Date,Site Visit Completed Date,Center Visit,Center Visit Date,Center Visit Completed Date,Virtual Meeting,Virtual Meeting Date,Virtual Meeting Completed Date,Out of Station,Requirement Within 2 Months,Ad Name,Ad Set,Campaign,Comment,Qualified Date,Hot Date,Warm Date,Interested Date,Meeting Arranged Date,CIF Date,Lead Won Date,Lead Lost Date,Created At,Updated At');

    for (const lead of leads) {
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

      csvRows.push(`${cleanText(lead.leadID)},${cleanText(lead.name)},${cleanText(lead.email)},${cleanText(lead.contactNumber)},${cleanText(lead.languageId?.name)},${cleanText(lead.sourceId?.name)},${cleanText(lead.centreId?.name)},${cleanText(lead.presalesUserId?.name)},${cleanText(lead.salesUserId?.name)},${cleanText(lead.leadStatusId?.name)},${cleanText(lead.leadSubStatusId?.name)},${cleanText(lead.leadValue)},${cleanText(lead.projectTypeId?.name)},${cleanText(lead.projectValue)},${cleanText(lead.apartmentName)},${cleanText(lead.houseTypeId?.name)},${formatDate(lead.expectedPossessionDate)},${formatBoolean(lead.siteVisit)},${formatDate(lead.siteVisitDate)},${formatDate(lead.siteVisitCompletedDate)},${formatBoolean(lead.centerVisit)},${formatDate(lead.centerVisitDate)},${formatDate(lead.centerVisitCompletedDate)},${formatBoolean(lead.virtualMeeting)},${formatDate(lead.virtualMeetingDate)},${formatDate(lead.virtualMeetingCompletedDate)},${formatBoolean(lead.outOfStation)},${formatBoolean(lead.requirementWithinTwoMonths)},${cleanText(lead.adname)},${cleanText(lead.adset)},${cleanText(lead.campaign)},${cleanText(lead.comment)},${formatDate(lead.qualifiedDate)},${formatDate(lead.hotDate)},${formatDate(lead.warmDate)},${formatDate(lead.interestedDate)},${cleanText(lead.meetingArrangedDate)},${cleanText(lead.cifDate)},${formatDate(lead.leadWonDate)},${formatDate(lead.leadLostDate)},${formatDate(lead.createdAt)},${formatDate(lead.updatedAt)}`);
    }

    const csvContent = csvRows.join('\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_${timestamp}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting leads CSV:', error);
    return errorResponse(res, 'Failed to export leads', 500);
  }
};

// Delete lead (soft delete)
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead || lead.deletedAt) {
      return errorResponse(res, 'Lead not found', 404);
    }

    lead.deletedAt = new Date();
    await lead.save();

    await LeadActivity.updateMany(
      { leadId: lead._id, deletedAt: null },
      { deletedAt: new Date() }
    );

    return successResponse(res, null, 'Lead deleted successfully');
  } catch (error) {
    console.error('Error deleting lead:', error);
    return errorResponse(res, 'Failed to delete lead', 500);
  }
};

// Get all leads with filters and pagination
exports.getAllLeads = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;
    const filter = { deletedAt: null };

    // Role-based filtering
    if (userRole === 'presales_agent') {
      filter.presalesUserId = req.user.userId;
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) filter.leadStatusId = leadStatus._id;
    } else if (userRole === 'sales_agent') {
      const wonStatus = await Status.findOne({ slug: 'won', type: 'leadStatus' });
      const lostStatus = await Status.findOne({ slug: 'lost', type: 'leadStatus' });
      filter.salesUserId = req.user.userId;
      if (wonStatus || lostStatus) {
        filter.leadStatusId = { $nin: [wonStatus?._id, lostStatus?._id].filter(Boolean) };
      }
    } else if (userRole === 'hod_presales' || userRole === 'manager_presales') {
      const leadStatus = await Status.findOne({ slug: 'lead', type: 'leadStatus' });
      if (leadStatus) filter.leadStatusId = leadStatus._id;
    } else if (userRole === 'sales_manager') {
      filter.centreId = user.centreId;
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (qualifiedStatus) filter.leadStatusId = qualifiedStatus._id;
    }

    // Apply filters
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { leadID: searchRegex },
        { email: searchRegex },
        { contactNumber: searchRegex }
      ];
    }
    if (req.query.source) filter.sourceId = req.query.source;
    if (req.query.leadValue) filter.leadValue = req.query.leadValue;
    if (req.query.centre) filter.centreId = req.query.centre;
    if (req.query.assignedTo) {
      filter.$and = [{ $or: [{ presalesUserId: req.query.assignedTo }, { salesUserId: req.query.assignedTo }] }];
    }
    if (req.query.leadStatus) filter.leadStatusId = req.query.leadStatus;
    if (req.query.leadSubStatus) filter.leadSubStatusId = req.query.leadSubStatus;
    if (req.query.siteVisit) filter.siteVisit = req.query.siteVisit === 'true';
    if (req.query.centerVisit) filter.centerVisit = req.query.centerVisit === 'true';
    if (req.query.virtualMeeting) filter.virtualMeeting = req.query.virtualMeeting === 'true';
    if (req.query.leadClosure) filter.leadClosure = req.query.leadClosure === 'true';
    if (req.query.outOfStation) filter.outOfStation = req.query.outOfStation === 'true';
    if (req.query.requirementWithinTwoMonths) filter.requirementWithinTwoMonths = req.query.requirementWithinTwoMonths === 'true';
    if (req.query.adname) filter.adname = new RegExp(req.query.adname, 'i');
    if (req.query.adset) filter.adset = new RegExp(req.query.adset, 'i');
    if (req.query.campaign) filter.campaign = new RegExp(req.query.campaign, 'i');

    // Date range filters
    if (req.query.dateFrom || req.query.dateTo) {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom + 'T00:00:00.000Z') : null;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo + 'T23:59:59.999Z') : null;
      const hasActivityFilters = req.query.siteVisit === 'true' || req.query.centerVisit === 'true' || req.query.virtualMeeting === 'true' || req.query.leadClosure === 'true';

      if (hasActivityFilters) {
        const activityDateConditions = [];
        if (req.query.siteVisit === 'true') {
          const siteVisitCondition = {};
          if (dateFrom) siteVisitCondition.$gte = dateFrom;
          if (dateTo) siteVisitCondition.$lte = dateTo;
          if (Object.keys(siteVisitCondition).length > 0) activityDateConditions.push({ siteVisitDate: siteVisitCondition });
        }
        if (req.query.centerVisit === 'true') {
          const centerVisitCondition = {};
          if (dateFrom) centerVisitCondition.$gte = dateFrom;
          if (dateTo) centerVisitCondition.$lte = dateTo;
          if (Object.keys(centerVisitCondition).length > 0) activityDateConditions.push({ centerVisitDate: centerVisitCondition });
        }
        if (req.query.virtualMeeting === 'true') {
          const virtualMeetingCondition = {};
          if (dateFrom) virtualMeetingCondition.$gte = dateFrom;
          if (dateTo) virtualMeetingCondition.$lte = dateTo;
          if (Object.keys(virtualMeetingCondition).length > 0) activityDateConditions.push({ virtualMeetingDate: virtualMeetingCondition });
        }
        if (req.query.leadClosure === 'true') {
          const leadClosureCondition = {};
          if (dateFrom) leadClosureCondition.$gte = dateFrom;
          if (dateTo) leadClosureCondition.$lte = dateTo;
          if (Object.keys(leadClosureCondition).length > 0) activityDateConditions.push({ leadClosureDate: leadClosureCondition });
        }
        if (activityDateConditions.length > 0) {
          filter.$or = filter.$or ? [...filter.$or, ...activityDateConditions] : activityDateConditions;
        }
      } else {
        let dateField = 'createdAt';
        if (req.query.leadStatus) {
          const selectedStatus = await Status.findById(req.query.leadStatus);
          if (selectedStatus?.slug === 'qualified') dateField = 'qualifiedDate';
          else if (selectedStatus?.slug === 'won') dateField = 'leadWonDate';
          else if (selectedStatus?.slug === 'lost') dateField = 'leadLostDate';
          else if (selectedStatus?.slug === 'lead') dateField = 'createdAt';
        }
        if (req.query.leadSubStatus) {
          const selectedSubStatus = await Status.findById(req.query.leadSubStatus);
          if (selectedSubStatus?.slug === 'hot') dateField = 'hotDate';
          else if (selectedSubStatus?.slug === 'warm') dateField = 'warmDate';
          else if (selectedSubStatus?.slug === 'interested') dateField = 'interestedDate';
          else if (selectedSubStatus?.slug === 'cif') dateField = 'cifDate';
          else if (selectedSubStatus?.slug === 'meeting-arranged') dateField = 'meetingArrangedDate';
        }
        const dateCondition = {};
        if (dateFrom) dateCondition.$gte = dateFrom;
        if (dateTo) dateCondition.$lte = dateTo;
        if (Object.keys(dateCondition).length > 0) filter[dateField] = dateCondition;
      }
    }

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortOrder };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate([
          { path: 'presalesUserId', select: 'name email mobileNumber' },
          { path: 'salesUserId', select: 'name email mobileNumber' },
          { path: 'languageId', select: 'name' },
          { path: 'sourceId', select: 'name' },
          { path: 'projectTypeId', select: 'name type' },
          { path: 'houseTypeId', select: 'name type' },
          { path: 'centreId', select: 'name' },
          { path: 'leadStatusId', select: 'name slug' },
          { path: 'leadSubStatusId', select: 'name slug' }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter)
    ]);

    const leadsWithActivity = await Promise.all(
      leads.map(async (lead) => {
        const [callLogCount, activityLogCount] = await Promise.all([
          CallLog.countDocuments({ leadId: lead._id, deletedAt: null }),
          ActivityLog.countDocuments({ leadId: lead._id, deletedAt: null })
        ]);

        let salesActivity = false;
        if (lead.salesUserId) {
          const [salesCallLogs, salesActivityLogs, salesLeadActivities] = await Promise.all([
            CallLog.countDocuments({ leadId: lead._id, userId: lead.salesUserId, deletedAt: null }),
            ActivityLog.countDocuments({ leadId: lead._id, userId: lead.salesUserId, deletedAt: null }),
            LeadActivity.countDocuments({ leadId: lead._id, updatedPerson: lead.salesUserId, deletedAt: null })
          ]);
          salesActivity = salesCallLogs > 0 || salesActivityLogs > 0 || salesLeadActivities > 0;
        }

        return {
          ...lead.toObject(),
          callLogCount,
          activityLogCount,
          salesActivity,
          hasActivity: callLogCount > 0 || activityLogCount > 0
        };
      })
    );

    return successResponse(res, {
      leads: leadsWithActivity,
      pagination: {
        current: page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Leads fetched successfully');
  } catch (error) {
    console.error('Error fetching leads:', error);
    return errorResponse(res, 'Failed to fetch leads', 500);
  }
};

// Get document file
exports.getDocument = (req, res) => {


  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/documents', filename);

  if (!fs.existsSync(filePath)) {
    return errorResponse(res, 'Document not found', 404);
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filePath);
};

// Create call log
exports.createCallLog = [
  upload.single('recording'),
  async (req, res) => {
    try {
      let actualLeadId = null;

      try {
        const leadActivity = await LeadActivity.findById(req.params.id);
        if (leadActivity) {
          actualLeadId = leadActivity.leadId;
        }
        const lead = await Lead.findById(req.params.id);
        if (lead) {
          actualLeadId = lead._id;
        }
      } catch (err) {
        // Ignore error
      }

      if (!actualLeadId) {
        // Clean up uploaded file if lead not found
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return errorResponse(res, 'Lead not found', 404);
      }

      const callLogData = {
        userId: req.user.userId,
        leadId: actualLeadId,
        dateTime: new Date()
      };

      // Add optional payload fields if provided
      if (req.body.callStartTime) callLogData.callStartTime = req.body.callStartTime;
      if (req.body.callEndTime) callLogData.callEndTime = req.body.callEndTime;
      if (req.body.durationSeconds) callLogData.durationSeconds = req.body.durationSeconds;
      if (req.body.comment) callLogData.comment = req.body.comment;
      
      // Add recording file path if uploaded
      if (req.file) {
        // Store relative path instead of absolute path
        const relativePath = path.join('uploads', 'recordings', req.file.filename);
        callLogData.recording = relativePath;
      }

      const callLog = new CallLog(callLogData);
      await callLog.save();
      await callLog.populate('userId', 'name email');

      return successResponse(res, { callLog }, 'Call log created successfully', 201);
    } catch (error) {
      console.error('Error creating call log:', error);
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Failed to create call log', 500);
    }
  }
];

// Upload recording for call log
exports.uploadRecording = [
  upload.single('recording'),
  async (req, res) => {
    try {
      if (!req.file) {
        return errorResponse(res, 'No recording file uploaded', 400);
      }

      const callLog = await CallLog.findById(req.params.id);
      if (!callLog) {
        // Clean up uploaded file if call log not found
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return errorResponse(res, 'Call log not found', 404);
      }

      // Remove old recording if exists
      if (callLog.recording) {
        let oldFilePath;
        if (path.isAbsolute(callLog.recording)) {
          oldFilePath = callLog.recording;
        } else {
          oldFilePath = path.join(__dirname, '..', callLog.recording);
        }
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Store relative path instead of absolute path
      const relativePath = path.join('uploads', 'recordings', req.file.filename);
      callLog.recording = relativePath;
      await callLog.save();
      await callLog.populate('userId', 'name email');

      return successResponse(res, { callLog }, 'Recording uploaded successfully', 200);
    } catch (error) {
      console.error('Error uploading recording:', error);
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return errorResponse(res, 'Failed to upload recording', 500);
    }
  }
];

// Download recording for call log
exports.downloadRecording = async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id);
    if (!callLog) {
      return errorResponse(res, 'Call log not found', 404);
    }

    if (!callLog.recording) {
      return errorResponse(res, 'Recording not found', 404);
    }

    // Handle both absolute and relative paths for backward compatibility
    let filePath;
    if (path.isAbsolute(callLog.recording)) {
      filePath = callLog.recording;
    } else {
      filePath = path.join(__dirname, '..', callLog.recording);
    }

    if (!fs.existsSync(filePath)) {
      return errorResponse(res, 'Recording file not found', 404);
    }

    const fileName = path.basename(filePath);
    res.download(filePath, fileName);
  } catch (error) {
    console.error('Error downloading recording:', error);
    return errorResponse(res, 'Failed to download recording', 500);
  }
};

// Get all lead activities for a lead
exports.getLeadActivities = async (req, res) => {
  try {
    const LeadActivity = require('../models/LeadActivity');
    
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return errorResponse(res, 'Lead not found', 404);
    }

    const leadActivities = await LeadActivity.find({ leadId: req.params.id, deletedAt: null })
      .populate([
        { path: 'presalesUserId', select: 'name email mobileNumber' },
        { path: 'salesUserId', select: 'name email mobileNumber' },
        { path: 'updatedPerson', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ])
      .sort({ createdAt: -1 });

    return successResponse(res, { leadActivities }, 'Lead activities fetched successfully');
  } catch (error) {
    console.error('Error fetching lead activities:', error);
    return errorResponse(res, 'Failed to fetch lead activities', 500);
  }
};

// Get lead by ID with activity data
exports.getLeadById = async (req, res) => {
  try {
    const CallLog = require('../models/CallLog');
    const ActivityLog = require('../models/ActivityLog');
    
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    const lead = await Lead.findById(req.params.id)
      .populate([
        { path: 'presalesUserId', select: 'name email mobileNumber' },
        { path: 'salesUserId', select: 'name email mobileNumber' },
        { path: 'updatedPerson', select: 'name email' },
        { path: 'languageId', select: 'name' },
        { path: 'sourceId', select: 'name' },
        { path: 'projectTypeId', select: 'name type' },
        { path: 'houseTypeId', select: 'name type' },
        { path: 'centreId', select: 'name' },
        { path: 'leadStatusId', select: 'name slug' },
        { path: 'leadSubStatusId', select: 'name slug' }
      ]);

    if (!lead || lead.deletedAt) {
      return errorResponse(res, 'Lead not found', 404);
    }

    if (userRole === 'sales_manager') {
      if (!lead.centreId || !lead.centreId.equals(user.centreId)) {
        return errorResponse(res, 'Access denied: Lead not from your center', 403);
      }
      const qualifiedStatus = await Status.findOne({ slug: 'qualified', type: 'leadStatus' });
      if (!qualifiedStatus || !lead.leadStatusId.equals(qualifiedStatus._id)) {
        return errorResponse(res, 'Access denied: Only qualified leads allowed', 403);
      }
    }

    const [callLogs, activityLogs] = await Promise.all([
      CallLog.find({ leadId: lead._id, deletedAt: null }).populate('userId', 'name email').sort({ createdAt: -1 }),
      ActivityLog.find({ leadId: lead._id, deletedAt: null }).populate('userId', 'name email').sort({ createdAt: -1 })
    ]);

    return successResponse(res, { lead, callLogs, activityLogs }, 'Lead fetched successfully');
  } catch (error) {
    console.error('Error fetching lead:', error);
    return errorResponse(res, 'Failed to fetch lead', 500);
  }
};

// Get lead activity timeline
exports.getLeadTimeline = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const CallLog = require('../models/CallLog');
    const ActivityLog = require('../models/ActivityLog');
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 'Invalid lead ID format', 400);
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.deletedAt) {
      return errorResponse(res, 'Lead not found', 404);
    }

    const [callLogs, activityLogs] = await Promise.all([
      CallLog.find({ leadId: lead._id, deletedAt: null }).populate('userId', 'name email').sort({ createdAt: -1 }),
      ActivityLog.find({ leadId: lead._id, deletedAt: null }).populate('userId', 'name email').sort({ createdAt: -1 })
    ]);

    const timeline = [
      ...callLogs.map(log => ({
        ...log.toObject(),
        type: 'call',
        title: 'Call Made',
        description: `Call made by ${log.userId.name}`,
        timestamp: log.createdAt
      })),
      ...activityLogs.map(log => ({
        ...log.toObject(),
        type: log.type,
        title: log.type === 'call' ? 'Call Activity' : 'Manual Activity',
        description: log.comment,
        timestamp: log.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return successResponse(res, { timeline }, 'Timeline fetched successfully');
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return errorResponse(res, 'Failed to fetch timeline', 500);
  }
};
