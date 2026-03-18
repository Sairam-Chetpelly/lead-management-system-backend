const CallLog = require('../models/CallLog');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const User = require('../models/User');
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=call-logs_${timestamp}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting call logs:', error);
    return errorResponse(res, 'Failed to export call logs', 500);
  }
};
