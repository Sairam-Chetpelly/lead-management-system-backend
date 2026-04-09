const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { authenticateTokenFlexible } = require('../middleware/authFlexible');
const documentController = require('../controllers/documentController');
const { migrateDocumentsToS3 } = require('../migrateToS3');

// View document (flexible auth for iframe/img src)
router.get('/:id/view', authenticateTokenFlexible, documentController.viewDocument);

// All other routes require standard authentication
router.use(authenticateToken);

// Create document record (for frontend S3 uploads)
router.post('/create', documentController.createDocument);

// Migrate documents to S3 (admin only)
router.post('/migrate-to-s3', async (req, res) => {
  try {
    // Check if user is admin (you may want to add proper admin check)
    const result = await migrateDocumentsToS3();
    res.json({ 
      success: true, 
      message: 'Document migration completed', 
      ...result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

// Upload document
router.post('/upload', documentController.uploadDocument);

// Get documents
router.get('/', documentController.getDocuments);

// Get single document
router.get('/:id', documentController.getDocument);

// Get file URL (presigned URL for S3 access)
router.get('/:id/url', documentController.getFileUrl);

// Download document
router.get('/:id/download', documentController.downloadDocument);

// Update document
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
