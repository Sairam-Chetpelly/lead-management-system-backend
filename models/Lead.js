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
  contactNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  alternateContactNumber: {
    type: String,
    default: null
  },
  address: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  state: {
    type: String,
    default: null
  },
  pincode: {
    type: String,
    default: null
  },
  occupation: {
    type: String,
    default: null
  },
  company: {
    type: String,
    default: null
  },
  designation: {
    type: String,
    default: null
  },
  annualIncome: {
    type: String,
    default: null
  },
  leadSource: {
    type: String,
    default: null
  },
  referredBy: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeadSource',
    required: true
  },
  salesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  presalesUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leadStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
    required: true
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

leadSchema.pre('save', async function(next) {
  if (!this.leadId) {
    const count = await mongoose.model('Lead').countDocuments();
    this.leadId = `LED${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Lead', leadSchema);