const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const folderController = require('../controllers/folderController');
const { syncFoldersToS3 } = require('../utils/folderSync');

router.use(authenticateToken);

// Sync existing folders to S3 (admin only)
router.post('/sync-to-s3', async (req, res) => {
  try {
    // Check if user is admin (you may want to add proper admin check)
    const result = await syncFoldersToS3();
    res.json({ 
      success: true, 
      message: 'Folder sync completed', 
      ...result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Sync failed', 
      error: error.message 
    });
  }
});

router.post('/', folderController.createFolder);
router.get('/all', folderController.getAllFolders);
router.get('/', folderController.getFolders);
router.get('/:id/path', folderController.getFolderPath);
router.post('/multi-download', folderController.multiDownload);
router.get('/:id/download', folderController.downloadFolder);
router.get('/:id', folderController.getFolderContents);
router.put('/:id', folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
