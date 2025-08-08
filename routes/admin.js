const express = require('express');
const { body, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const Role = require('../models/Role');
const Centre = require('../models/Centre');
const Language = require('../models/Language');
const Status = require('../models/Status');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all items for dropdowns (without pagination)
router.get('/roles/all', authenticateToken, async (req, res) => {
  try {
    const roles = await Role.find({ deletedAt: null }).select('_id name slug');
    res.json({ data: roles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/centres/all', authenticateToken, async (req, res) => {
  try {
    const centres = await Centre.find({ deletedAt: null }).select('_id name slug');
    res.json({ data: centres });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/languages/all', authenticateToken, async (req, res) => {
  try {
    const languages = await Language.find({ deletedAt: null }).select('_id name slug code');
    res.json({ data: languages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/statuses/all', authenticateToken, async (req, res) => {
  try {
    const statuses = await Status.find({ deletedAt: null }).select('_id name slug');
    res.json({ data: statuses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Roles CRUD with pagination
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [roles, total] = await Promise.all([
      Role.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Role.countDocuments(filter)
    ]);
    
    res.json({
      data: roles,
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

router.post('/roles', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const role = new Role(req.body);
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/roles/:id', authenticateToken, async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/roles/:id', authenticateToken, async (req, res) => {
  try {
    await Role.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Role deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Centres CRUD with pagination
router.get('/centres', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [centres, total] = await Promise.all([
      Centre.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Centre.countDocuments(filter)
    ]);
    
    res.json({
      data: centres,
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

router.post('/centres', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const centre = new Centre(req.body);
    await centre.save();
    res.status(201).json(centre);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/centres/:id', authenticateToken, async (req, res) => {
  try {
    const centre = await Centre.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(centre);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/centres/:id', authenticateToken, async (req, res) => {
  try {
    await Centre.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Centre deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Languages CRUD with pagination
router.get('/languages', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [languages, total] = await Promise.all([
      Language.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Language.countDocuments(filter)
    ]);
    
    res.json({
      data: languages,
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

router.post('/languages', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  body('code').notEmpty().withMessage('Code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const language = new Language(req.body);
    await language.save();
    res.status(201).json(language);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/languages/:id', authenticateToken, async (req, res) => {
  try {
    const language = await Language.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(language);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/languages/:id', authenticateToken, async (req, res) => {
  try {
    await Language.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Language deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Statuses CRUD with pagination
router.get('/statuses', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [statuses, total] = await Promise.all([
      Status.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Status.countDocuments(filter)
    ]);
    
    res.json({
      data: statuses,
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

router.post('/statuses', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const status = new Status(req.body);
    await status.save();
    res.status(201).json(status);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/statuses/:id', authenticateToken, async (req, res) => {
  try {
    const status = await Status.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(status);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/statuses/:id', authenticateToken, async (req, res) => {
  try {
    await Status.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ message: 'Status deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Excel Export Routes
router.get('/roles/export', authenticateToken, async (req, res) => {
  try {
    const roles = await Role.find({ deletedAt: null }).select('name slug createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(roles.map(role => ({
      Name: role.name,
      Slug: role.slug,
      'Created At': new Date(role.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=roles.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/centres/export', authenticateToken, async (req, res) => {
  try {
    const centres = await Centre.find({ deletedAt: null }).select('name slug createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(centres.map(centre => ({
      Name: centre.name,
      Slug: centre.slug,
      'Created At': new Date(centre.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Centres');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=centres.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/languages/export', authenticateToken, async (req, res) => {
  try {
    const languages = await Language.find({ deletedAt: null }).select('name slug code createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(languages.map(language => ({
      Name: language.name,
      Slug: language.slug,
      Code: language.code,
      'Created At': new Date(language.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Languages');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=languages.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/statuses/export', authenticateToken, async (req, res) => {
  try {
    const statuses = await Status.find({ deletedAt: null }).select('name slug createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(statuses.map(status => ({
      Name: status.name,
      Slug: status.slug,
      'Created At': new Date(status.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statuses');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=statuses.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel Export Routes
router.get('/roles/export', authenticateToken, async (req, res) => {
  try {
    const roles = await Role.find({ deletedAt: null }).select('name slug createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(roles.map(role => ({
      Name: role.name,
      Slug: role.slug,
      'Created At': new Date(role.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roles');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=roles.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/centres/export', authenticateToken, async (req, res) => {
  try {
    const centres = await Centre.find({ deletedAt: null }).select('name slug createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(centres.map(centre => ({
      Name: centre.name,
      Slug: centre.slug,
      'Created At': new Date(centre.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Centres');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=centres.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/languages/export', authenticateToken, async (req, res) => {
  try {
    const languages = await Language.find({ deletedAt: null }).select('name slug code createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(languages.map(language => ({
      Name: language.name,
      Slug: language.slug,
      Code: language.code,
      'Created At': new Date(language.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Languages');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=languages.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/statuses/export', authenticateToken, async (req, res) => {
  try {
    const statuses = await Status.find({ deletedAt: null }).select('name slug createdAt').sort({ createdAt: -1 });
    const worksheet = XLSX.utils.json_to_sheet(statuses.map(status => ({
      Name: status.name,
      Slug: status.slug,
      'Created At': new Date(status.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Statuses');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=statuses.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;