const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const folderController = require('../controllers/folderController');

router.use(authenticateToken);

router.post('/', folderController.createFolder);
router.get('/all', folderController.getAllFolders);
router.get('/', folderController.getFolders);
router.get('/:id', folderController.getFolderContents);
router.put('/:id', folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
