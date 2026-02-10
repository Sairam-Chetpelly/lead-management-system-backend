const Document = require('../models/Document');
const Keyword = require('../models/Keyword');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
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

      const document = new Document({
        folderId: folderId || null,
        fileName: req.file.originalname,
        title,
        subtitle,
        filePath: req.file.path,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
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
