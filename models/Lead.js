const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: true
  },
  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: true
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  centerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Centre'
  },
  assignmentType: {
    type: String,
    enum: ['auto', 'manual'],
    default: null
  },
  presalesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    set: v => v === '' ? null : v
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    set: v => v === '' ? null : v
  },
  leadSubstatus: {
    type: String,
    enum: ['hot', 'warm', 'cif']
  },
  cifDateTime: {
    type: Date
  },
  leadValue: {
    type: String,
    enum: ['high_value', 'low_value']
  },
  nextCallDateTime: {
    type: Date
  },
  isQualified: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

leadSchema.pre('save', async function(next) {
  if (!this.leadId) {
    try {
      const count = await mongoose.model('Lead').countDocuments();
      this.leadId = `LED${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating leadId:', error);
      this.leadId = `LED${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);