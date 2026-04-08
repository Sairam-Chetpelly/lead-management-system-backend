const Document = require('../models/Document');
const Keyword = require('../models/Keyword');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addWatermark } = require('../utils/watermark');
const { successResponse, errorResponse } = require('../utils/response');
const s3Service = require('../services/s3Service');

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

// Upload document with S3 support
exports.uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    console.log('=== S3 UPLOAD START ===');
    console.log('1. Request received');
    console.log('2. Request body:', req.body);
    console.log('3. File info:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file');
    
    try {
      const { category, description, folderId, keywords, title, subtitle, useS3 = 'true' } = req.body;
      console.log('4. Extracted body data:', { category, folderId, keywords, title, subtitle, useS3 });

      if (!req.file) {
        console.log('5. ERROR: No file uploaded');
        return errorResponse(res, 'No file uploaded', 400);
      }
      console.log('5. File validated successfully');

      // Process keywords
      let keywordIds = [];
      if (keywords) {
        console.log('6. Processing keywords:', keywords);
        const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
        console.log('7. Keyword array:', keywordArray);
        
        for (const keywordName of keywordArray) {
          if (keywordName) {
            let keyword = await Keyword.findOne({ name: keywordName.toLowerCase() });
            if (!keyword) {
              console.log('8. Creating new keyword:', keywordName);
              keyword = await Keyword.create({ name: keywordName.toLowerCase() });
            }
            keyword.usageCount += 1;
            await keyword.save();
            keywordIds.push(keyword._id);
          }
        }
        console.log('9. Keywords processed, IDs:', keywordIds);
      } else {
        console.log('6. No keywords to process');
      }

      // Process images: convert to WebP and compress
      let finalPath = req.file.path;
      let finalMimeType = req.file.mimetype;
      let finalFileName = req.file.originalname;
      console.log('10. Initial file path:', finalPath);
      
      if (req.file.mimetype.startsWith('image/')) {
        console.log('11. Image detected, converting to WebP');
        const sharp = require('sharp');
        const webpPath = finalPath.replace(path.extname(finalPath), '.webp');
        
        try {
          await sharp(finalPath)
            .webp({ quality: 80 })
            .toFile(webpPath);
          console.log('12. WebP conversion successful');
          
          fs.unlinkSync(finalPath);
          finalPath = webpPath;
          finalMimeType = 'image/webp';
          finalFileName = req.file.originalname.replace(path.extname(req.file.originalname), '.webp');
          console.log('13. Updated to WebP path:', finalPath);
        } catch (error) {
          console.error('12. Image conversion error:', error.message);
        }
      } else {
        console.log('11. Not an image, skipping conversion');
      }

      // Add watermark
      console.log('14. Adding watermark');
      try {
        finalPath = await addWatermark(finalPath, finalMimeType);
        console.log('15. Watermark added successfully');
      } catch (error) {
        console.error('15. Watermark error:', error.message);
      }

      let s3Key = null;
      let s3Url = null;
      let storageType = 'local';

      // Upload to S3 if enabled
      if (useS3 === 'true') {
        console.log('16. Uploading to S3');
        try {
          s3Key = s3Service.generateS3Key(finalFileName, req.user.userId);
          const s3Result = await s3Service.uploadFile(finalPath, s3Key, finalMimeType);
          s3Url = s3Result.url;
          storageType = 's3';
          console.log('17. S3 upload successful:', s3Url);
          
          // Clean up local file after S3 upload
          if (fs.existsSync(finalPath)) {
            fs.unlinkSync(finalPath);
            console.log('18. Local file cleaned up');
          }
        } catch (error) {
          console.error('17. S3 upload error:', error.message);
          // Fall back to local storage
          console.log('18. Falling back to local storage');
        }
      } else {
        console.log('16. Using local storage');
      }

      console.log('19. Creating document record');
      const document = new Document({
        folderId: folderId || null,
        fileName: finalFileName,
        title,
        subtitle,
        filePath: storageType === 's3' ? s3Url : finalPath,
        s3Key,
        s3Url,
        storageType,
        fileType: finalMimeType,
        fileSize: storageType === 's3' ? req.file.size : fs.statSync(finalPath).size,
        uploadedBy: req.user.userId,
        category,
        description,
        keywords: keywordIds
      });
      console.log('20. Document object created');

      await document.save();
      console.log('21. Document saved to database');
      
      await document.populate(['uploadedBy', 'keywords', 'folderId']);
      console.log('22. Document populated');

      console.log('23. SUCCESS - Sending response');
      console.log('=== S3 UPLOAD END ===');
      return successResponse(res, document, 'Document uploaded successfully', 201);
    } catch (error) {
      console.error('ERROR at step:', error.message);
      console.error('Full error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        console.log('Cleaning up uploaded file');
        fs.unlinkSync(req.file.path);
      }
      console.log('=== S3 UPLOAD FAILED ===');
      return errorResponse(res, error.message, 500);
    }
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
    return successResponse(res, { documents }, 'Documents retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get single document
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null })
      .populate('uploadedBy', 'name email')
      .populate('keywords');
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    return successResponse(res, document, 'Document retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Download document with S3 support
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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayDownloads = await DownloadLog.countDocuments({
        userId: req.user.userId,
        downloadDate: { $gte: startOfDay, $lte: endOfDay }
      });

      if (todayDownloads >= 50) {
        return errorResponse(res, 'Daily download limit reached. You can download up to 50 documents per day. Limit resets at midnight.', 400);
      }

      await DownloadLog.create({
        userId: req.user.userId,
        documentId: document._id,
        downloadDate: new Date()
      });
    }

    // Handle S3 downloads
    if (document.storageType === 's3' && document.s3Key) {
      try {
        const signedUrl = await s3Service.getSignedDownloadUrl(document.s3Key);
        return res.redirect(signedUrl);
      } catch (error) {
        console.error('S3 download error:', error);
        return errorResponse(res, 'Failed to generate download link', 500);
      }
    }

    // Handle local downloads
    if (fs.existsSync(document.filePath)) {
      res.download(document.filePath, document.fileName);
    } else {
      return errorResponse(res, 'File not found', 404);
    }
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// View/Preview document with S3 support
exports.viewDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null });
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    
    // Handle S3 preview
    if (document.storageType === 's3' && document.s3Key) {
      try {
        const signedUrl = await s3Service.getSignedDownloadUrl(document.s3Key, 300); // 5 minutes
        return res.redirect(signedUrl);
      } catch (error) {
        console.error('S3 preview error:', error);
        return errorResponse(res, 'Failed to generate preview link', 500);
      }
    }
    
    // Handle local preview
    if (!fs.existsSync(document.filePath)) {
      return errorResponse(res, 'File not found on server', 404);
    }
    
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error('View document error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete document with S3 support
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    
    // Delete from S3 if stored there
    if (document.storageType === 's3' && document.s3Key) {
      try {
        await s3Service.deleteFile(document.s3Key);
        console.log('File deleted from S3:', document.s3Key);
      } catch (error) {
        console.error('S3 delete error:', error);
        // Continue with soft delete even if S3 delete fails
      }
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

// Get S3 presigned URL for direct upload
exports.getS3PresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      return errorResponse(res, 'fileName and fileType are required', 400);
    }

    const s3Key = s3Service.generateS3Key(fileName, req.user.userId);
    
    // This would require additional implementation for presigned POST URLs
    // For now, we'll use the upload endpoint
    
    return successResponse(res, { 
      message: 'Use the upload endpoint for file uploads',
      uploadEndpoint: '/api/documents/upload'
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};