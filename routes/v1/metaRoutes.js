const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { refreshMetaToken } = require('../../utils/metaTokenRefresh');

router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    const result = await refreshMetaToken();
    res.json({ message: 'Token refreshed successfully', expiresIn: result.expiresIn });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh token', details: error.message });
  }
});

module.exports = router;
