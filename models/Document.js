const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  fileName: {
    type: String,
    required: true
  },
  title: {
    type: String
  },
  subtitle: {
    type: String
  },
  filePath: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    default: null
  },
  s3Url: {
    type: String,
    default: null
  },
  storageType: {
    type: String,
    enum: ['local', 's3'],
    default: 'local'
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    default: 'Other'
  },
  description: {
    type: String
  },
  keywords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Keyword'
  }],
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
