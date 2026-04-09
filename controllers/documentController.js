const Document = require('../models/Document');
const Keyword = require('../models/Keyword');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const { documentUpload, deleteS3File, getSignedUrl, uploadToS3 } = require('../utils/s3Service');
const { successResponse, errorResponse } = require('../utils/response');

// Upload document
exports.uploadDocument = [
  documentUpload.single('file'),
  async (req, res) => {
    console.log('=== S3 UPLOAD START ===');
    console.log('1. Request received');
    console.log('2. Request body:', req.body);
    console.log('3. File info:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file');
    
    try {
      const { category, description, folderId, keywords, title, subtitle } = req.body;
      console.log('4. Extracted body data:', { category, folderId, keywords, title, subtitle });

      if (!req.file) {
        console.log('5. ERROR: No file uploaded');
        return errorResponse(res, 'No file uploaded', 400);
      }
      console.log('5. File received, uploading to S3...');

      // Upload to S3
      const s3Result = await uploadToS3(req.file, 'documents');
      console.log('6. File uploaded to S3:', s3Result);

      // Process keywords
      let keywordIds = [];
      if (keywords) {
        console.log('7. Processing keywords:', keywords);
        const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
        console.log('8. Keyword array:', keywordArray);
        
        for (const keywordName of keywordArray) {
          if (keywordName) {
            let keyword = await Keyword.findOne({ name: keywordName.toLowerCase() });
            if (!keyword) {
              console.log('9. Creating new keyword:', keywordName);
              keyword = await Keyword.create({ name: keywordName.toLowerCase() });
            }
            keyword.usageCount += 1;
            await keyword.save();
            keywordIds.push(keyword._id);
          }
        }
        console.log('10. Keywords processed, IDs:', keywordIds);
      } else {
        console.log('7. No keywords to process');
      }

      console.log('11. Creating document record');
      const document = new Document({
        folderId: folderId || null,
        fileName: req.file.originalname,
        title,
        subtitle,
        filePath: s3Result.location, // S3 URL
        s3Key: s3Result.key, // S3 key for deletion
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: req.user.userId,
        category,
        description,
        keywords: keywordIds
      });
      console.log('12. Document object created');

      await document.save();
      console.log('13. Document saved to database');
      
      await document.populate(['uploadedBy', 'keywords', 'folderId']);
      console.log('14. Document populated');

      console.log('15. SUCCESS - Sending response');
      console.log('=== S3 UPLOAD END ===');
      return successResponse(res, document, 'Document uploaded successfully', 201);
    } catch (error) {
      console.error('ERROR at step:', error.message);
      console.error('Full error:', error);
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

    // Generate signed URL for S3 download
    const downloadUrl = getSignedUrl(document.s3Key, 300); // 5 minutes expiry
    res.redirect(downloadUrl);
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
    
    // Generate signed URL for S3 viewing
    const viewUrl = getSignedUrl(document.s3Key, 300); // 5 minutes expiry
    res.redirect(viewUrl);
  } catch (error) {
    console.error('View document error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Delete document (soft delete)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return errorResponse(res, 'Document not found', 404);
    }
    
    // Delete from S3
    if (document.s3Key) {
      try {
        await deleteS3File(document.s3Key);
      } catch (error) {
        console.error('S3 deletion error:', error);
        // Continue with soft delete even if S3 deletion fails
      }
    }
    
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
