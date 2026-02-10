const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const keywordController = require('../controllers/keywordController');

router.use(authenticateToken);

router.post('/', keywordController.createKeyword);
router.get('/', keywordController.getAllKeywords);
router.get('/:id', keywordController.getKeyword);
router.put('/:id', keywordController.updateKeyword);
router.delete('/:id', keywordController.deleteKeyword);

module.exports = router;
