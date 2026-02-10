const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { authenticateTokenFlexible } = require('../middleware/authFlexible');
const documentController = require('../controllers/documentController');

// View document (flexible auth for iframe/img src)
router.get('/:id/view', authenticateTokenFlexible, documentController.viewDocument);

// All other routes require standard authentication
router.use(authenticateToken);

// Upload document
router.post('/upload', documentController.uploadDocument);

// Get documents
router.get('/', documentController.getDocuments);

// Get single document
router.get('/:id', documentController.getDocument);

// Download document
router.get('/:id/download', documentController.downloadDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
