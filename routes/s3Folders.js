const express = require('express');
const router = express.Router();
const s3FolderController = require('../controllers/s3FolderController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create folder with S3 support
router.post('/', s3FolderController.createFolder);

// Get folders by parent or root
router.get('/', s3FolderController.getFolders);

// Get all folders (for tree view)
router.get('/all', s3FolderController.getAllFolders);

// Multi-download documents
router.post('/multi-download', s3FolderController.multiDownload);

// Get folder contents
router.get('/:id', s3FolderController.getFolderContents);

// Download entire folder
router.get('/:id/download', s3FolderController.downloadFolder);

// Update folder
router.put('/:id', s3FolderController.updateFolder);

// Delete folder with S3 support
router.delete('/:id', s3FolderController.deleteFolder);

module.exports = router;