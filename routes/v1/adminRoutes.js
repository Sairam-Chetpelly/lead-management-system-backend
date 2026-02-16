const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { roleValidation, centreValidation, languageValidation, statusValidation } = require('../../validations/v1/adminValidation');

const roleController = require('../../controllers/v1/roleController');
const centreController = require('../../controllers/v1/centreController');
const languageController = require('../../controllers/v1/languageController');
const statusController = require('../../controllers/v1/statusController');
const adminUserController = require('../../controllers/v1/adminUserController');
const leadController = require('../../controllers/v1/leadController');

// Roles
router.get('/roles/all', authenticateToken, roleController.getAllSimple);
router.get('/roles', authenticateToken, roleController.getAll);
router.post('/roles', authenticateToken, roleValidation, roleController.create);
router.put('/roles/:id', authenticateToken, roleController.update);
router.delete('/roles/:id', authenticateToken, roleController.deleteRole);
router.get('/roles/export', authenticateToken, roleController.exportRoles);

// Centres
router.get('/centres/all', authenticateToken, centreController.getAllSimple);
router.get('/centres', authenticateToken, centreController.getAll);
router.post('/centres', authenticateToken, centreValidation, centreController.create);
router.put('/centres/:id', authenticateToken, centreController.update);
router.delete('/centres/:id', authenticateToken, centreController.deleteCentre);
router.get('/centres/export', authenticateToken, centreController.exportCentres);

// Languages
router.get('/languages/all', authenticateToken, languageController.getAllSimple);
router.get('/languages', authenticateToken, languageController.getAll);
router.post('/languages', authenticateToken, languageValidation, languageController.create);
router.put('/languages/:id', authenticateToken, languageController.update);
router.delete('/languages/:id', authenticateToken, languageController.deleteLanguage);
router.get('/languages/export', authenticateToken, languageController.exportLanguages);

// Statuses
router.get('/statuses/all', authenticateToken, statusController.getAllSimple);
router.get('/statuses', authenticateToken, statusController.getAll);
router.post('/statuses', authenticateToken, statusValidation, statusController.create);
router.put('/statuses/:id', authenticateToken, statusController.update);
router.delete('/statuses/:id', authenticateToken, statusController.deleteStatus);
router.get('/statuses/export', authenticateToken, statusController.exportStatuses);

// Users
router.get('/users', authenticateToken, adminUserController.getAll);
router.delete('/users/:id', authenticateToken, adminUserController.deleteUser);

// Leads
router.delete('/leads/:id', authenticateToken, leadController.deleteLead);

module.exports = router;
