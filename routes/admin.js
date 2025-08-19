const express = require('express');
const { body } = require('express-validator');
const Role = require('../models/Role');
const Centre = require('../models/Centre');
const Language = require('../models/Language');
const Status = require('../models/Status');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const createCrudController = require('../utils/crudController');
const router = express.Router();

// Create CRUD controllers
const roleController = createCrudController(Role, 'Role', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' }
]);

const centreController = createCrudController(Centre, 'Centre', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' }
]);

const languageController = createCrudController(Language, 'Language', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'code', label: 'Code' }
]);

const statusController = createCrudController(Status, 'Status', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' }
]);

// Get all items for dropdowns (without pagination)
router.get('/roles/all', authenticateToken, roleController.getAllSimple);
router.get('/centres/all', authenticateToken, centreController.getAllSimple);
router.get('/languages/all', authenticateToken, languageController.getAllSimple);
router.get('/statuses/all', authenticateToken, statusController.getAllSimple);

// Users endpoint for admin
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('roleId', 'name slug')
        .populate('statusId', 'name slug')
        .populate('centreId', 'name slug')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);
    
    res.json({
      data: users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Roles CRUD with pagination
router.get('/roles', authenticateToken, roleController.getAll);
router.post('/roles', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], roleController.create);
router.put('/roles/:id', authenticateToken, roleController.update);
router.delete('/roles/:id', authenticateToken, roleController.delete);

// Centres CRUD with pagination
router.get('/centres', authenticateToken, centreController.getAll);
router.post('/centres', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], centreController.create);
router.put('/centres/:id', authenticateToken, centreController.update);
router.delete('/centres/:id', authenticateToken, centreController.delete);

// Languages CRUD with pagination
router.get('/languages', authenticateToken, languageController.getAll);
router.post('/languages', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  body('code').notEmpty().withMessage('Code is required')
], languageController.create);
router.put('/languages/:id', authenticateToken, languageController.update);
router.delete('/languages/:id', authenticateToken, languageController.delete);

// Statuses CRUD with pagination
router.get('/statuses', authenticateToken, statusController.getAll);
router.post('/statuses', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], statusController.create);
router.put('/statuses/:id', authenticateToken, statusController.update);
router.delete('/statuses/:id', authenticateToken, statusController.delete);

// Export Routes (JSON for CSV)
router.get('/roles/export', authenticateToken, roleController.export);
router.get('/centres/export', authenticateToken, centreController.export);
router.get('/languages/export', authenticateToken, languageController.export);
router.get('/statuses/export', authenticateToken, statusController.export);

module.exports = router;