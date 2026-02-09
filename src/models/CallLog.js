const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callId: {
    type: String,
    unique: true
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
  dateTime: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

callLogSchema.pre('save', async function(next) {
  if (!this.callId) {
    const count = await mongoose.model('CallLog').countDocuments();
    this.callId = `CALL${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CallLog', callLogSchema);