const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  name: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  presalesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: false
  },
  leadSubStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: false
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: false
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: true
  },
  centreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    required: false
  },
  projectTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType',
    required: false
  },
  projectValue: {
    type: String,
    required: false
  },
  apartmentName: {
    type: String,
    required: false
  },
  houseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType',
    required: false
  },
  expectedPossessionDate: {
    type: Date,
    required: false
  },
  leadValue: {
    type: String,
    enum: ['high value', 'medium value', 'low value'],
    required: false
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi', 'debit card', 'credit card', 'emi', 'cheque', 'loan'],
    required: false
  },
  siteVisit: {
    type: Boolean,
    required: false
  },
  siteVisitDate: {
    type: Date,
    required: false
  },
  centerVisit: {
    type: Boolean,
    required: false
  },
  centerVisitDate: {
    type: Date,
    required: false
  },
  virtualMeeting: {
    type: Boolean,
    required: false
  },
  virtualMeetingDate: {
    type: Date,
    required: false
  },

  notes: {
    type: String,
    required: false
  },
  comment: {
    type: String,
    required: false
  },
  files: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeadActivity', leadActivitySchema);