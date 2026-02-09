const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['status', 'leadStatus', 'leadSubStatus'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Status', statusSchema);