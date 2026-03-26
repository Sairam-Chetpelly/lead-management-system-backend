const mongoose = require('mongoose');

const downloadLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  downloadDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
downloadLogSchema.index({ userId: 1, downloadDate: 1 });

module.exports = mongoose.model('DownloadLog', downloadLogSchema);
