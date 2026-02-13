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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
  

// Upload document
exports.uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    console.log('=== UPLOAD START ===');
    console.log('1. Request received');
    console.log('2. Request body:', req.body);
    console.log('3. File info:', req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : 'No file');
    
    try {
      const { category, description, folderId, keywords, title, subtitle } = req.body;
      console.log('4. Extracted body data:', { category, folderId, keywords, title, subtitle });

      if (!req.file) {
        console.log('5. ERROR: No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
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

      console.log('16. Creating document record');
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
      console.log('17. Document object created');

      await document.save();
      console.log('18. Document saved to database');
      
      await document.populate(['uploadedBy', 'keywords', 'folderId']);
      console.log('19. Document populated');

      console.log('20. SUCCESS - Sending response');
      console.log('=== UPLOAD END ===');
      res.status(201).json(document);
    } catch (error) {
      console.error('ERROR at step:', error.message);
      console.error('Full error:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        console.log('Cleaning up uploaded file');
        fs.unlinkSync(req.file.path);
      }
      console.log('=== UPLOAD FAILED ===');
      res.status(500).json({ error: error.message });
    }
  }
];

// Get documents by folder or root
exports.getDocuments = async (req, res) => {
  try {
    const { folderId, keyword, keywords } = req.query;
    
    let query = { deletedAt: null };
    
    // If search or keyword filters are active, search all documents
    const hasFilters = keyword || keywords;
    
    if (!hasFilters) {
      // No filters: show only current folder documents
      if (folderId) {
        query.folderId = folderId;
      } else if (folderId === undefined) {
        query.folderId = null;
      }
    }
    // If filters are active, search across all documents (ignore folderId)
    
    // Search by single keyword (text search)
    if (keyword) {
      const keywordDoc = await Keyword.findOne({ name: { $regex: keyword, $options: 'i' } });
      if (keywordDoc) {
        query.keywords = keywordDoc._id;
      } else {
        // Also search in title, subtitle, fileName
        query.$or = [
          { title: { $regex: keyword, $options: 'i' } },
          { subtitle: { $regex: keyword, $options: 'i' } },
          { fileName: { $regex: keyword, $options: 'i' } }
        ];
      }
    }
    
    // Filter by multiple keywords
    if (keywords) {
      const keywordArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      if (keywordArray.length > 0) {
        const keywordDocs = await Keyword.find({ name: { $in: keywordArray } });
        const keywordIds = keywordDocs.map(k => k._id);
        if (keywordIds.length > 0) {
          query.keywords = { $in: keywordIds };
        } else {
          return res.json([]);
        }
      }
    }
    
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .populate('keywords')
      .populate('folderId', 'name')
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

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const { title, subtitle, category, keywords } = req.body;
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Decrease old keywords usage count
    for (const keywordId of document.keywords) {
      const keyword = await Keyword.findById(keywordId);
      if (keyword) {
        keyword.usageCount = Math.max(0, keyword.usageCount - 1);
        await keyword.save();
      }
    }

    // Process new keywords
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
    
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
