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
    required: false
  },
  contactNumber: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Contact number must be exactly 10 digits'
    }
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
    enum: ['high value', 'low value'],
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
  siteVisitCompletedDate: {
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
  centerVisitCompletedDate: {
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
  virtualMeetingCompletedDate: {
    type: Date,
    required: false
  },
  meetingArrangedDate: {
    type: String,
    required: false
  },
  cifDate: {
    type: String,
    required: false
  },
  leadWonDate: {
    type: Date,
    required: false
  },
  leadLostDate: {
    type: Date,
    required: false
  },
  qualifiedDate: {
    type: Date,
    required: false
  },
  hotDate: {
    type: Date,
    required: false
  },
  warmDate: {
    type: Date,
    required: false
  },
  interestedDate: {
    type: Date,
    required: false
  },
  comment: {
    type: String,
    required: false
  },
  outOfStation: {
    type: Boolean,
    required: false,
    default: false
  },
  requirementWithinTwoMonths: {
    type: Boolean,
    required: false,
    default: true
  },
  adname: {
    type: String,
    required: false
  },
  adset: {
    type: String,
    required: false
  },
  campaign: {
    type: String,
    required: false
  },
  cpUserName: {
    type: String,
    required: false,
    default: null
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