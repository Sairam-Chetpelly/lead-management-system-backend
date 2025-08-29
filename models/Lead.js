const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadID: {
    type: String,
    unique: true,
    required: false
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
    required: true,
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
  meetingArrangedDate: {
    type: Date,
    required: false
  },
  cifDate: {
    type: Date,
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

leadSchema.pre('save', async function(next) {
  if (!this.leadID) {
    const count = await mongoose.model('Lead').countDocuments();
    this.leadID = `LEAD${String(count + 1).padStart(6, '0')}`;
  }
  
  // Create LeadActivity snapshot when lead is updated (not on initial creation)
  if (!this.isNew && this.isModified()) {
    const LeadActivity = mongoose.model('LeadActivity');
    const leadActivityData = {
      leadId: this._id,
      name: this.name,
      email: this.email,
      contactNumber: this.contactNumber,
      presalesUserId: this.presalesUserId,
      salesUserId: this.salesUserId,
      updatedPerson: this.updatedPerson,
      leadStatusId: this.leadStatusId,
      leadSubStatusId: this.leadSubStatusId,
      languageId: this.languageId,
      sourceId: this.sourceId,
      centreId: this.centreId,
      projectTypeId: this.projectTypeId,
      projectValue: this.projectValue,
      apartmentName: this.apartmentName,
      houseTypeId: this.houseTypeId,
      expectedPossessionDate: this.expectedPossessionDate,
      leadValue: this.leadValue,
      siteVisit: this.siteVisit,
      siteVisitDate: this.siteVisitDate,
      centerVisit: this.centerVisit,
      centerVisitDate: this.centerVisitDate,
      virtualMeeting: this.virtualMeeting,
      virtualMeetingDate: this.virtualMeetingDate,
      meetingArrangedDate: this.meetingArrangedDate,
      cifDate: this.cifDate,
      leadWonDate: this.leadWonDate,
      leadLostDate: this.leadLostDate,
      qualifiedDate: this.qualifiedDate,
      hotDate: this.hotDate,
      warmDate: this.warmDate,
      interestedDate: this.interestedDate,
      comment: this.comment,
      files: this.files
    };
    
    const leadActivity = new LeadActivity(leadActivityData);
    await leadActivity.save();
  }
  
  next();
});

module.exports = mongoose.model('Lead', leadSchema);