const express = require('express');
const router = express.Router();
const s3DocumentController = require('../controllers/s3DocumentController');
const { authenticateToken } = require('../middleware/auth');
const { authenticateTokenFlexible } = require('../middleware/authFlexible');

// View document (flexible auth for iframe/img src)
router.get('/:id/view', authenticateTokenFlexible, s3DocumentController.viewDocument);

// All other routes require standard authentication
router.use(authenticateToken);

// Upload document with S3 support
router.post('/upload', s3DocumentController.uploadDocument);

// Get documents
router.get('/', s3DocumentController.getDocuments);

// Get single document
router.get('/:id', s3DocumentController.getDocument);

// Download document
router.get('/:id/download', s3DocumentController.downloadDocument);

// View/Preview document
router.get('/:id/view', s3DocumentController.viewDocument);

// Update document
router.put('/:id', s3DocumentController.updateDocument);

// Delete document
router.delete('/:id', s3DocumentController.deleteDocument);

// Get S3 presigned URL
router.post('/s3-presigned-url', s3DocumentController.getS3PresignedUrl);

module.exports = router;