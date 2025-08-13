const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  updatedPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  email: String,
  contactNumber: String,
  presalesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  leadSubStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: true
  },
  projectTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType'
  },
  projectValue: String,
  apartmentName: String,
  houseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType'
  },
  expectedPossessionDate: Date,
  leadValue: {
    type: String,
    enum: ['high', 'low']
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi', 'debit card', 'credit card', 'emi', 'cheque', 'loan']
  },
  siteVisit: Boolean,
  siteVisitDate: Date,
  centerVisit: Boolean,
  centerVisitDate: Date,
  virtualMeeting: Boolean,
  virtualMeetingDate: Date,
  isCompleted: Boolean,
  isCompletedDate: Date,
  notes: String,
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeadActivity', leadActivitySchema);