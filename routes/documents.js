const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { authenticateTokenFlexible } = require('../middleware/authFlexible');
const documentController = require('../controllers/documentController');

// View document (flexible auth for iframe/img src)
router.get('/:id/view', authenticateTokenFlexible, documentController.viewDocument);

// All other routes require standard authentication
router.use(authenticateToken);

// Download limit and logging routes (must come before /:id routes)
router.get('/download-limit', documentController.checkDownloadLimit);
router.post('/log-download', documentController.logDownload);
router.get('/download-stats', documentController.getDownloadStats);
router.post('/multi-download', documentController.multiDownload);
router.post('/details', documentController.getDocumentDetails);

// S3 Upload routes
router.post('/upload-urls', documentController.getUploadUrls);
router.post('/create', documentController.createDocument);
router.post('/s3/initialize', documentController.initializeS3Upload);
router.post('/s3/complete', documentController.completeS3Upload);
router.post('/s3/abort', documentController.abortS3Upload);

// Upload document (legacy - for small files)
router.post('/upload', documentController.uploadDocument);

// Get documents
router.get('/', documentController.getDocuments);

// Get single document
router.get('/:id', documentController.getDocument);

// Download document
router.get('/:id/download', documentController.downloadDocument);

// Update document
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
