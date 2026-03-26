const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, checkRole } = require('../middleware/auth');
const controller = require('../controllers/userController');
const { createUserValidation } = require('../validators/userValidation');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get('/export-csv', authenticateToken, controller.exportCSV);
router.get('/search-dropdown', authenticateToken, controller.searchDropdown);
router.get('/all', authenticateToken, controller.getAllUnfiltered);
router.get('/profile-image/:filename', controller.getProfileImage);
router.get('/', authenticateToken, controller.getAll);
router.post('/', authenticateToken,  createUserValidation, controller.create);
router.post('/:id/profile-image', authenticateToken, upload.single('profileImage'), controller.uploadProfileImage);
router.put('/:id', authenticateToken, controller.update);
router.delete('/:id', authenticateToken, checkRole(['admin']), controller.delete);

module.exports = router;