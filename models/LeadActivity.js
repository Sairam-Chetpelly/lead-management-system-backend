const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  name: {
    type: String,
    default: null
  },
  email: {
    type: String,
    default: null
  },
  contactNumber: {
    type: String,
    default: null
  },
  presalesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    default: null
  },
  leadSubStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    default: null
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    default: null
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: true
  },
  projectTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType',
    default: null
  },
  projectValue: {
    type: String,
    default: null
  },
  apartmentName: {
    type: String,
    default: null
  },
  houseTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectAndHouseType',
    default: null
  },
  expectedPossessionDate: {
    type: Date,
    default: null
  },
  leadValue: {
    type: String,
    enum: ['high value', 'medium value', 'low value'],
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'upi', 'debit card', 'credit card', 'emi', 'cheque', 'loan'],
    default: null
  },
  siteVisit: {
    type: Boolean,
    default: null
  },
  siteVisitDate: {
    type: Date,
    default: null
  },
  centerVisit: {
    type: Boolean,
    default: null
  },
  centerVisitDate: {
    type: Date,
    default: null
  },
  virtualMeeting: {
    type: Boolean,
    default: null
  },
  virtualMeetingDate: {
    type: Date,
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: null
  },
  isCompletedDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre',
    default: null
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LeadActivity', leadActivitySchema);