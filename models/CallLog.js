const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callId: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  datetime: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Generate unique call ID before validation
callLogSchema.pre('validate', function(next) {
  if (!this.callId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.callId = `CALL-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('CallLog', callLogSchema);