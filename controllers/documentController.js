const Document = require('../models/Document');
const Keyword = require('../models/Keyword');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addWatermark } = require('../utils/watermark');
const { successResponse, errorResponse } = require('../utils/response');
const { 
  uploadFileToS3, 
  uploadProcessedFileToS3, 
  deleteFileFromS3, 
  generatePresignedUrl, 
  getS3FileStream, 
  generateDocumentS3Path 
} = require('../utils/s3DocumentService');

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});
  

// Create document record (for frontend S3 uploads)
exports.createDocument = async (req, res) => {
  try {
    const { folderId, fileName, title, subtitle, s3Key, fileType, fileSize, category, keywords } = req.body;
    
    console.log('Creating document record:', { fileName, s3Key, fileType, category });

    // Validate file type and size
    if (!fileName || !s3Key || !fileType) {
      return errorResponse(res, 'Missing required file information', 400);
    }

    // Check file size limit (50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return errorResponse(res, 'File size exceeds 50MB limit', 400);
    }

    // Process keywords
    let keywordIds = [];
    if (keywords && keywords.length > 0) {
      for (const keywordName of keywords) {
        if (keywordName) {
          let keyword = await Keyword.findOne({ name: keywordName.toLowerCase() });
          if (!keyword) {
            keyword = await Keyword.create({ name: keywordName.toLowerCase() });
          }
          keyword.usageCount += 1;
          await keyword.save();
          keywordIds.push(keyword._id);
        }
      }
    }

    const document = new Document({
      folderId: folderId || null,
      fileName,
      title: title || fileName.split('.')[0], // Use filename as title if not provided
      subtitle,
      filePath: s3Key, // Store S3 key as filePath
      fileType,
      fileSize,
      uploadedBy: req.user.userId,
      category: category || 'other',
      keywords: keywordIds
    });

    await document.save();
    await document.populate(['uploadedBy', 'keywords', 'folderId']);

    // Add file metadata to response
    const documentObj = document.toObject();
    documentObj.fileMetadata = getFileMetadata(document.fileName, document.fileType);

    return successResponse(res, documentObj, 'Document created successfully', 201);
  } catch (error) {
    console.error('Create document error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Upload document (legacy - kept for backward compatibility)
exports.uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    return errorResponse(res, 'Please use direct S3 upload from frontend', 400);
  }
];

// Get documents by folder or root
exports.getDocuments = async (req, res) => {
  try {
    const { folderId, keyword, keywords, categories, startDate, endDate } = req.query;
    
    let query = { deletedAt: null };
    
    const hasFilters = keyword || keywords || categories || startDate || endDate;
    
    if (!hasFilters) {
      if (folderId) {
        query.folderId = folderId;
      } else if (folderId === undefined) {
        query.folderId = null;
      }
    }
    
    if (keyword) {
      const keywordDoc = await Keyword.findOne({ name: { $regex: keyword, $options: 'i' } });
      if (keywordDoc) {
        query.keywords = keywordDoc._id;
      } else {
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { subtitle: { $regex: keyword, $options: 'i' } },
          { fileName: { $regex: keyword, $options: 'i' } },
          { category: { $regex: keyword, $options: 'i' } }
        ];
      }
    }
    
    if (keywords) {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      if (keywordArray.length > 0) {
        const keywordDocs = await Keyword.find({ name: { $in: keywordArray } });
        const keywordIds = keywordDocs.map(k => k._id);
        if (keywordIds.length > 0) {
          query.keywords = { $in: keywordIds };
        } else {
          return successResponse(res, { documents: [] }, 'No documents found');
        }
      }
    }
    
    if (categories) {
      const categoryArray = categories.split(',').map(c => c.trim()).filter(c => c);
      if (categoryArray.length > 0) {
        query.category = { $in: categoryArray.map(c => new RegExp(`^${c}$`, 'i')) };
      }
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .populate('keywords')
      .populate('folderId', 'name')
      .sort({ createdAt: -1 });
    
    // Add file type metadata for better frontend handling
    const documentsWithMetadata = documents.map(doc => {
      const docObj = doc.toObject();
      docObj.fileMetadata = getFileMetadata(doc.fileName, doc.fileType);
      return docObj;
    });
    
    return successResponse(res, { documents: documentsWithMetadata }, 'Documents retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Helper function to get file metadata
const getFileMetadata = (fileName, fileType) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const metadata = {
    extension,
    category: 'other',
    previewable: false,
    icon: 'file'
  };
  
  // Text files
  if (['txt', 'rtf', 'log'].includes(extension) || fileType.includes('text/plain')) {
    metadata.category = 'text';
    metadata.previewable = true;
    metadata.icon = 'file-text';
  }
  // CSV files
  else if (['csv', 'tsv'].includes(extension) || fileType.includes('text/csv')) {
    metadata.category = 'spreadsheet';
    metadata.previewable = true;
    metadata.icon = 'file-spreadsheet';
  }
  // Excel files
  else if (['xlsx', 'xls', 'xlsm', 'xlsb', 'xltx', 'xltm', 'xlt'].includes(extension) || 
           fileType.includes('spreadsheet') || fileType.includes('excel')) {
    metadata.category = 'spreadsheet';
    metadata.previewable = true;
    metadata.icon = 'file-spreadsheet';
  }
  // Word documents
  else if (['docx', 'doc', 'docm', 'dotx', 'dotm', 'dot', 'odt'].includes(extension) ||
           fileType.includes('word') || fileType.includes('document') || 
           fileType.includes('wordprocessingml')) {
    metadata.category = 'document';
    metadata.previewable = true;
    metadata.icon = 'file-text';
  }
  // PDF files
  else if (extension === 'pdf' || fileType.includes('pdf')) {
    metadata.category = 'pdf';
    metadata.previewable = true;
    metadata.icon = 'file-text';
  }
  // PowerPoint files
  else if (['ppt', 'pptx', 'pps', 'ppsx', 'potx', 'potm', 'pptm'].includes(extension) ||
           fileType.includes('presentation') || fileType.includes('powerpoint')) {
    metadata.category = 'presentation';
    metadata.previewable = true;
    metadata.icon = 'presentation';
  }
  // Image files
  else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'ico'].includes(extension) ||
           fileType.startsWith('image/')) {
    metadata.category = 'image';
    metadata.previewable = true;
    metadata.icon = 'image';
  }
  // Video files
  else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp'].includes(extension) ||
           fileType.startsWith('video/')) {
    metadata.category = 'video';
    metadata.previewable = true;
    metadata.icon = 'video';
  }
  // Audio files
  else if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma', 'm4a'].includes(extension) ||
           fileType.startsWith('audio/')) {
    metadata.category = 'audio';
    metadata.previewable = true;
    metadata.icon = 'music';
  }
  
  return metadata;
};

// Get single document
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null })
      .populate('uploadedBy', 'name email')
      .populate('keywords')
      .populate('folderId', 'name');
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    
    // Add file metadata
    const documentObj = document.toObject();
    documentObj.fileMetadata = getFileMetadata(document.fileName, document.fileType);
    
    return successResponse(res, documentObj, 'Document retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null });
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Check user role and download limit
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    // Admin has unlimited downloads, others have 50 limit
    if (userRole !== 'admin') {
      // Get today's start and end timestamps
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Count today's downloads for this user
      const todayDownloads = await DownloadLog.countDocuments({
        userId: req.user.userId,
        downloadDate: { $gte: startOfDay, $lte: endOfDay }
      });

      // Check if limit exceeded
      if (todayDownloads >= 50) {
        return errorResponse(res, 'Daily download limit reached. You can download up to 50 documents per day. Limit resets at midnight.', 400);
      }

      // Log the download for non-admin users only
      await DownloadLog.create({
        userId: req.user.userId,
        documentId: document._id,
        downloadDate: new Date()
      });
    }

    // Get file from S3
    try {
      const fileStream = await getS3FileStream(document.filePath);
      
      res.setHeader('Content-Type', document.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      
      fileStream.pipe(res);
    } catch (s3Error) {
      console.error('S3 download error:', s3Error);
      return errorResponse(res, 'File not found or unable to download', 404);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// View/Preview document
exports.viewDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null });
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    
    try {
      const fileStream = await getS3FileStream(document.filePath);
      
      // Set appropriate headers based on file type
      const contentType = getContentType(document.fileName, document.fileType);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      
      // Add CORS headers for better browser compatibility
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      fileStream.pipe(res);
    } catch (s3Error) {
      console.error('S3 view error:', s3Error);
      return errorResponse(res, 'File not found on server', 404);
    }
  } catch (error) {
    console.error('View document error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Helper function to get proper content type
const getContentType = (fileName, originalFileType) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Override content types for better browser handling
  const contentTypeMap = {
    'pdf': 'application/pdf',
    'txt': 'text/plain; charset=utf-8',
    'csv': 'text/csv; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'xml': 'application/xml; charset=utf-8',
    'html': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
  };
  
  return contentTypeMap[extension] || originalFileType || 'application/octet-stream';
};

// Delete document (soft delete)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    
    // Delete from S3
    try {
      await deleteFileFromS3(document.filePath);
      console.log(`S3 file deleted: ${document.filePath}`);
    } catch (s3Error) {
      console.error('Failed to delete S3 file:', s3Error);
      // Continue with soft delete even if S3 deletion fails
    }
    
    // Update keyword usage counts
    for (const keywordId of document.keywords) {
      const keyword = await Keyword.findById(keywordId);
      if (keyword) {
        keyword.usageCount = Math.max(0, keyword.usageCount - 1);
        await keyword.save();
      }
    }
    
    document.deletedAt = new Date();
    await document.save();
    return successResponse(res, null, 'Document deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get presigned URL for file access
exports.getFileUrl = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null });
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    // Generate presigned URL (valid for 1 hour)
    const presignedUrl = await generatePresignedUrl(document.filePath, 3600);
    
    return successResponse(res, { 
      url: presignedUrl,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: document.fileSize,
      fileMetadata: getFileMetadata(document.fileName, document.fileType)
    }, 'File URL generated successfully');
  } catch (error) {
    console.error('Get file URL error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const { title, subtitle, category, keywords } = req.body;
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }

    for (const keywordId of document.keywords) {
      const keyword = await Keyword.findById(keywordId);
      if (keyword) {
        keyword.usageCount = Math.max(0, keyword.usageCount - 1);
        await keyword.save();
      }
    }

    let keywordIds = [];
    if (keywords && keywords.length > 0) {
      for (const keywordName of keywords) {
        if (keywordName) {
          let keyword = await Keyword.findOne({ name: keywordName.toLowerCase() });
          if (!keyword) {
            keyword = await Keyword.create({ name: keywordName.toLowerCase() });
          }
          keyword.usageCount += 1;
          await keyword.save();
          keywordIds.push(keyword._id);
        }
      }
    }

    document.title = title;
    document.subtitle = subtitle;
    document.category = category;
    document.keywords = keywordIds;
    
    await document.save();
    await document.populate(['uploadedBy', 'keywords', 'folderId']);
    
    return successResponse(res, document, 'Document updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
