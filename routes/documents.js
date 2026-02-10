const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const documentController = require('../controllers/documentController');

// All routes require authentication
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
