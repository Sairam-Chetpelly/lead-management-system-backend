const Document = require('../models/Document');
const Keyword = require('../models/Keyword');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addWatermark } = require('../utils/watermark');

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload document
exports.uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { category, description, folderId, keywords, title, subtitle } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
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

      // Process images: convert to WebP and compress
      let finalPath = req.file.path;
      let finalMimeType = req.file.mimetype;
      let finalFileName = req.file.originalname;
      
      if (req.file.mimetype.startsWith('image/')) {
        const sharp = require('sharp');
        const webpPath = finalPath.replace(path.extname(finalPath), '.webp');
        
        try {
          await sharp(finalPath)
            .webp({ quality: 80 })
            .toFile(webpPath);
          
          // Delete original image
          fs.unlinkSync(finalPath);
          finalPath = webpPath;
          finalMimeType = 'image/webp';
          finalFileName = req.file.originalname.replace(path.extname(req.file.originalname), '.webp');
        } catch (error) {
          console.error('Image conversion error:', error.message);
          // Continue with original if conversion fails
        }
      }

      // Add watermark to images and PDFs
      try {
        finalPath = await addWatermark(finalPath, finalMimeType);
      } catch (error) {
        console.error('Watermark error:', error.message);
        // Continue without watermark if it fails
      }

      const document = new Document({
        folderId: folderId || null,
        fileName: finalFileName,
        title,
        subtitle,
        filePath: finalPath,
        fileType: finalMimeType,
        fileSize: fs.statSync(finalPath).size,
        uploadedBy: req.user.userId,
        category,
        description,
        keywords: keywordIds
      });

      await document.save();
      await document.populate(['uploadedBy', 'keywords']);

      res.status(201).json(document);
    } catch (error) {
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: error.message });
    }
  }
];

// Get documents by folder or root
exports.getDocuments = async (req, res) => {
  try {
    const { folderId, keyword } = req.query;
    
    let query = { deletedAt: null };
    
    if (folderId) {
      query.folderId = folderId;
    } else if (folderId === undefined) {
      query.folderId = null;
    }
    
    // Search by keyword
    if (keyword) {
      const keywordDoc = await Keyword.findOne({ name: keyword.toLowerCase() });
      if (keywordDoc) {
        query.keywords = keywordDoc._id;
      } else {
        return res.json([]);
      }
    }
    
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .populate('keywords')
      .sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single document
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null })
      .populate('uploadedBy', 'name email')
      .populate('keywords');
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.download(document.filePath, document.fileName);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// View/Preview document
exports.viewDocument = async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, deletedAt: null });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    res.setHeader('Content-Type', document.fileType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(document.filePath));
  } catch (error) {
    console.error('View document error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete document (soft delete)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Decrease keyword usage count
    for (const keywordId of document.keywords) {
      const keyword = await Keyword.findById(keywordId);
      if (keyword) {
        keyword.usageCount = Math.max(0, keyword.usageCount - 1);
        await keyword.save();
      }
    }
    
    document.deletedAt = new Date();
    await document.save();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
