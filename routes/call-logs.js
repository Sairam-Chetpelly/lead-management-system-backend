const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const { authenticateToken } = require('../middleware/auth');

// GET export call logs
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const callLogs = await CallLog.find()
      .populate('userId', 'name email')
      .populate('leadId', 'name contactNumber email leadId')
      .sort({ datetime: -1 });
    
    const csvData = callLogs.map(log => ({
      'Call ID': log.callId || log._id,
      'User': log.userId?.name || '',
      'User Email': log.userId?.email || '',
      'Lead Name': log.leadId?.name || '',
      'Lead ID': log.leadId?.leadId || '',
      'Contact Number': log.leadId?.contactNumber || '',
      'Lead Email': log.leadId?.email || '',
      'Call Date Time': log.datetime ? new Date(log.datetime).toLocaleString() : '',
      'Created At': new Date(log.createdAt).toLocaleString(),
      'Updated At': new Date(log.updatedAt).toLocaleString()
    }));
    
    res.json(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all call logs
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', user = '', lead = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (user) filter.userId = user;
    if (lead) filter.leadId = lead;

    const callLogs = await CallLog.find(filter)
      .populate('userId', 'name email roleId')
      .populate('leadId', 'name contactNumber email leadId')
      .sort({ datetime: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await CallLog.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      data: callLogs,
      pagination: {
        current: pageNum,
        pages: totalPages,
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET call logs by lead
router.get('/lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const callLogs = await CallLog.find({ 
      leadId: req.params.leadId
    })
      .populate('userId', 'name email roleId')
      .sort({ datetime: -1 });
    res.json(callLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new call log
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, leadId, datetime } = req.body;
    
    const callLog = new CallLog({
      userId,
      leadId,
      datetime: datetime || new Date()
    });
    
    const savedCallLog = await callLog.save();
    
    const populatedCallLog = await CallLog.findById(savedCallLog._id)
      .populate('userId', 'name email')
      .populate('leadId', 'name contactNumber email leadId');
    
    res.status(201).json(populatedCallLog);
  } catch (error) {
    console.error('Call log creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update call log
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { userId, leadId, datetime } = req.body;
    
    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      { userId, leadId, datetime },
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('leadId', 'name contactNumber email leadId');
    
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    
    res.json(callLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE call log
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const callLog = await CallLog.findByIdAndDelete(req.params.id);
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    res.json({ message: 'Call log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;