const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
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
  callDateTime: {
    type: Date,
    default: Date.now
  },
  callDuration: {
    type: Number,
    default: 0
  },
  callStatus: {
    type: String,
    enum: ['connected', 'not_connected'],
    required: true
  },
  callOutcome: {
    type: String,
    enum: [
      'not_interested',
      'language_mismatch', 
      'follow_up',
      'qualified',
      'not_reachable',
      'incorrect_number',
      'not_picking',
      'site_visit',
      'meeting_scheduled',
      'won'
    ]
  },
  purchaseAmount: {
    type: Number
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'loan', 'emi', 'cheque']
  },
  siteVisitDateTime: {
    type: Date
  },
  meetingDateTime: {
    type: Date
  },
  nextCallDateTime: {
    type: Date
  },
  originalLanguageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language'
  },
  updatedLanguageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language'
  },
  cifDateTime: {
    type: Date
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language'
  },
  assignedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  leadValue: {
    type: String,
    enum: ['high_value', 'low_value']
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre'
  },
  apartmentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType'
  },
  followUpAction: {
    type: String,
    enum: ['not_interested', 'follow_up', 'qualified']
  },
  notes: {
    type: String
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CallLog', callLogSchema);