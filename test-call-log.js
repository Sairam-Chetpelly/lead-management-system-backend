// Test script to verify call log creation
const mongoose = require('mongoose');
const CallLog = require('./models/CallLog');
require('dotenv').config();

async function testCallLog() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const testData = {
      userId: new mongoose.Types.ObjectId(),
      leadId: new mongoose.Types.ObjectId(),
      callDuration: 120,
      callStatus: 'connected',
      notes: 'Test call log'
    };

    const callLog = new CallLog(testData);
    const saved = await callLog.save();
    console.log('Test call log saved:', saved);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCallLog();