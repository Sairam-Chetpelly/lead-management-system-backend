const Document = require('../models/Document');
const Keyword = require('../models/Keyword');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addWatermark } = require('../utils/watermark');
const { successResponse, errorResponse } = require('../utils/response');
const S3Service = require('../utils/s3Service');

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
  limits: { fileSize: 500 * 1024 * 1024 } // Increased to 500MB
});

// Initialize S3 upload (for files > 100MB)
exports.initializeS3Upload = async (req, res) => {
  try {
    const { fileName, fileSize, fileType, folderId } = req.body;
    
    if (!fileName || !fileSize || !fileType) {
      return errorResponse(res, 'fileName, fileSize, and fileType are required', 400);
    }

    const s3Key = await S3Service.generateS3KeyByFolder(req.user.userId, fileName, folderId);
    const totalParts = S3Service.calculateParts(fileSize);
    
    // For files < 50MB, use single upload
    if (fileSize < 50 * 1024 * 1024) {
      const presignedUrl = await S3Service.getPresignedUploadUrl(s3Key, fileType);
      return successResponse(res, {
        uploadType: 'single',
        s3Key,
        presignedUrl
      }, 'Single upload URL generated');
    }
    
    // For large files, use multipart upload
    const uploadId = await S3Service.initializeMultipartUpload(s3Key, fileType, {
      originalName: fileName,
      uploadedBy: req.user.userId,
      folderId: folderId || 'root'
    });
    
    const presignedUrls = await S3Service.getMultipartPresignedUrls(s3Key, uploadId, totalParts);
    
    return successResponse(res, {
      uploadType: 'multipart',
      uploadId,
      s3Key,
      totalParts,
      presignedUrls
    }, 'Multipart upload initialized');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Complete S3 upload and create document record
exports.completeS3Upload = async (req, res) => {
  try {
    const { 
      s3Key, 
      uploadId, 
      parts, 
      fileName, 
      fileSize, 
      fileType,
      category, 
      description, 
      folderId, 
      keywords, 
      title, 
      subtitle 
    } = req.body;
    
    if (!s3Key || !fileName || !fileSize || !fileType) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    // Complete multipart upload if applicable
    if (uploadId && parts) {
      await S3Service.completeMultipartUpload(s3Key, uploadId, parts);
    }

    // Process keywords
    let keywordIds = [];
    if (keywords) {
      const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
      
      for (const keywordName of keywordArray) {
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

    // Create document record
    const document = new Document({
      folderId: folderId || null,
      fileName,
      title,
      subtitle,
      filePath: s3Key,
      s3Key,
      fileType,
      fileSize,
      uploadedBy: req.user.userId,
      category,
      description,
      keywords: keywordIds
    });

    await document.save();
    await document.populate(['uploadedBy', 'keywords', 'folderId']);

    return successResponse(res, document, 'Document uploaded successfully', 201);
  } catch (error) {
    // Cleanup failed multipart upload
    if (req.body.uploadId && req.body.s3Key) {
      try {
        await S3Service.abortMultipartUpload(req.body.s3Key, req.body.uploadId);
      } catch (cleanupError) {
        console.error('Failed to cleanup multipart upload:', cleanupError);
      }
    }
    return errorResponse(res, error.message, 500);
  }
};

// Abort S3 upload
exports.abortS3Upload = async (req, res) => {
  try {
    const { s3Key, uploadId } = req.body;
    
    if (!s3Key || !uploadId) {
      return errorResponse(res, 's3Key and uploadId are required', 400);
    }

    await S3Service.abortMultipartUpload(s3Key, uploadId);
    return successResponse(res, null, 'Upload aborted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
  

// Upload document (now uses S3 by default)
exports.uploadDocument = [
  upload.single('file'),
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
      console.log('5. File validated successfully');

      // Generate S3 key based on folder
      const s3Key = await S3Service.generateS3KeyByFolder(req.user.userId, req.file.originalname, folderId);
      console.log('6. Generated S3 key:', s3Key);

      // Upload file to S3
      console.log('7. Uploading file to S3...');
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      // Process file before uploading to S3
      let processedFilePath = req.file.path;
      let finalMimeType = req.file.mimetype;
      let finalFileName = req.file.originalname;
      
      // Process images: convert to WebP and compress
      if (req.file.mimetype.startsWith('image/')) {
        console.log('8. Image detected, converting to WebP');
        const sharp = require('sharp');
        const webpPath = processedFilePath.replace(path.extname(processedFilePath), '.webp');
        
        try {
          await sharp(processedFilePath)
            .webp({ quality: 80 })
            .toFile(webpPath);
          console.log('9. WebP conversion successful');
          
          fs.unlinkSync(processedFilePath);
          processedFilePath = webpPath;
          finalMimeType = 'image/webp';
          finalFileName = req.file.originalname.replace(path.extname(req.file.originalname), '.webp');
          console.log('10. Updated to WebP path:', processedFilePath);
        } catch (error) {
          console.error('9. Image conversion error:', error.message);
        }
      } else {
        console.log('8. Not an image, skipping conversion');
      }

      // Add watermark
      console.log('11. Adding watermark');
      try {
        processedFilePath = await addWatermark(processedFilePath, finalMimeType);
        console.log('12. Watermark added successfully');
      } catch (error) {
        console.error('12. Watermark error:', error.message);
      }

      // Check file size for chunked upload
      const fileStats = fs.statSync(processedFilePath);
      const fileSize = fileStats.size;
      console.log('13. File size after processing:', fileSize, 'bytes');
      
      if (fileSize > 50 * 1024 * 1024) { // Files > 50MB use multipart (lowered threshold for testing)
        console.log('13a. Large file detected, using multipart upload');
        const { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = require('@aws-sdk/client-s3');
        
        // Initialize multipart upload
        const createCommand = new CreateMultipartUploadCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
          ContentType: finalMimeType,
          Metadata: {
            originalName: finalFileName,
            uploadedBy: req.user.userId,
            category: category || 'documents'
          }
        });
        
        const { UploadId } = await s3Client.send(createCommand);
        console.log('13b. Multipart upload initialized:', UploadId);
        
        // Upload parts in chunks
        const chunkSize = 10 * 1024 * 1024; // 10MB chunks
        const fileBuffer = fs.readFileSync(processedFilePath);
        const totalParts = Math.ceil(fileSize / chunkSize);
        const parts = [];
        
        for (let i = 0; i < totalParts; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, fileSize);
          const chunk = fileBuffer.slice(start, end);
          
          const uploadPartCommand = new UploadPartCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: s3Key,
            PartNumber: i + 1,
            UploadId,
            Body: chunk
          });
          
          const { ETag } = await s3Client.send(uploadPartCommand);
          parts.push({ ETag, PartNumber: i + 1 });
          
          console.log(`13c. Uploaded part ${i + 1}/${totalParts} (${Math.round((end/fileSize)*100)}%)`);
        }
        
        // Complete multipart upload
        const completeCommand = new CompleteMultipartUploadCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
          UploadId,
          MultipartUpload: { Parts: parts }
        });
        
        await s3Client.send(completeCommand);
        console.log('13d. Multipart upload completed');
      } else {
        console.log('13a. Small file, using single upload with stream');
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3Key,
          Body: fs.createReadStream(processedFilePath),
          ContentType: finalMimeType,
          Metadata: {
            originalName: finalFileName,
            uploadedBy: req.user.userId,
            category: category || 'documents'
          }
        });
        
        await s3Client.send(uploadCommand);
      }
      console.log('13. File uploaded to S3 successfully');

      // Clean up local file
      fs.unlinkSync(processedFilePath);
      console.log('14. Local temp file cleaned up');

      // Process keywords
      let keywordIds = [];
      if (keywords) {
        console.log('15. Processing keywords:', keywords);
        const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
        console.log('16. Keyword array:', keywordArray);
        
        for (const keywordName of keywordArray) {
          if (keywordName) {
            let keyword = await Keyword.findOne({ name: keywordName.toLowerCase() });
            if (!keyword) {
              console.log('17. Creating new keyword:', keywordName);
              keyword = await Keyword.create({ name: keywordName.toLowerCase() });
            }
            keyword.usageCount += 1;
            await keyword.save();
            keywordIds.push(keyword._id);
          }
        }
        console.log('18. Keywords processed, IDs:', keywordIds);
      } else {
        console.log('15. No keywords to process');
      }

      console.log('19. Creating document record');
      const document = new Document({
        folderId: folderId || null,
        fileName: finalFileName,
        title: title || finalFileName.split('.')[0],
        subtitle,
        filePath: s3Key,
        s3Key,
        fileType: finalMimeType,
        fileSize: req.file.size,
        uploadedBy: req.user.userId,
        category: category || 'Other',
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
      return successResponse(res, document, 'Document uploaded to S3 successfully', 201);
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
    
    res.download(document.filePath, document.fileName);
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

// Delete document (soft delete)
exports.deleteDocument = async (req, res) => {
  try {
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
