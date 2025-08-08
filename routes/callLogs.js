const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');
const { authenticateToken } = require('../middleware/auth');

// GET all call logs
router.get('/', async (req, res) => {
  try {
    const callLogs = await CallLog.find({ deletedAt: null })
      .populate('userId', 'name')
      .populate('leadId', 'name');
    res.json(callLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET call logs by lead ID
router.get('/lead/:leadId', async (req, res) => {
  try {
    const callLogs = await CallLog.find({ 
      leadId: req.params.leadId, 
      deletedAt: null 
    })
      .populate('userId', 'name')
      .populate('leadId', 'name')
      .sort({ createdAt: -1 });
    res.json(callLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET call log by ID
router.get('/:id', async (req, res) => {
  try {
    const callLog = await CallLog.findById(req.params.id)
      .populate('userId')
      .populate('leadId');
    if (!callLog || callLog.deletedAt) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    res.json(callLog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new call log
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    if (!req.body.leadId) {
      return res.status(400).json({ message: 'leadId is required' });
    }
    
    const callLogData = {
      leadId: req.body.leadId,
      userId: req.user.userId,
      dateTime: new Date()
    };
    
    console.log('CallLog data:', callLogData);
    
    const callLog = new CallLog(callLogData);
    const savedCallLog = await callLog.save();
    res.status(201).json(savedCallLog);
  } catch (error) {
    console.error('CallLog creation error:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT update call log
router.put('/:id', async (req, res) => {
  try {
    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!callLog || callLog.deletedAt) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    res.json(callLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE call log (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const callLog = await CallLog.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }
    res.json({ message: 'Call log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;