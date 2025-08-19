const mongoose = require('mongoose');
require('dotenv').config();

const CallLog = require('./models/CallLog');
const User = require('./models/User');
const Lead = require('./models/Lead');

async function testNewCallLog() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    console.log('Connected to MongoDB');

    // Find a user and lead for testing
    const user = await User.findOne();
    const lead = await Lead.findOne();

    if (!user || !lead) {
      console.log('Need at least one user and one lead to test');
      return;
    }

    console.log('Testing with user:', user.name, 'and lead:', lead.name);

    // Create a new call log
    const callLog = new CallLog({
      userId: user._id,
      leadId: lead._id,
      datetime: new Date()
    });

    const savedCallLog = await callLog.save();
    console.log('Call log created successfully with Call ID:', savedCallLog.callId);
    console.log('Full call log:', savedCallLog);

    // Fetch the call log with populated data
    const populatedCallLog = await CallLog.findById(savedCallLog._id)
      .populate('userId', 'name email')
      .populate('leadId', 'name contactNumber email leadId');

    console.log('Populated call log with Call ID:', populatedCallLog.callId);

    // Clean up - delete the test call log
    await CallLog.findByIdAndDelete(savedCallLog._id);
    console.log('Test call log deleted');

  } catch (error) {
    console.error('Error testing call log:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testNewCallLog();