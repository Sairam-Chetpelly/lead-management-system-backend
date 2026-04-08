const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  parentFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restricted: {
    type: Boolean,
    default: false
  },
  s3Path: {
    type: String,
    default: null
  },
  storageType: {
    type: String,
    enum: ['local', 's3', 'both'],
    default: 'both'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Folder', folderSchema);
