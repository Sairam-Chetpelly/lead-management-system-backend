const mongoose = require('mongoose');

const projectAndHouseTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['project', 'house'],
    required: true
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

module.exports = mongoose.model('ProjectAndHouseType', projectAndHouseTypeSchema);