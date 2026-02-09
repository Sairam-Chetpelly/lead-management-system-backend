const mongoose = require('mongoose');

const metaTokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  refreshedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MetaToken', metaTokenSchema);