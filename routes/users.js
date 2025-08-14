const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const User = require('../models/User');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configure multer for profile image uploads
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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all users with pagination and filtering (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '', centre = '' } = req.query;
    
    // Build filter query
    const filter = { deletedAt: null };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) filter.roleId = role;
    if (status) filter.statusId = status;
    if (centre) filter.centreId = centre;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('roleId')
        .populate('statusId')
        .populate('centreId')
        .populate('languageIds')
        .select('-password')
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

// Create user (Admin only)
router.post('/', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('designation').notEmpty().withMessage('Designation is required'),
  body('roleId').notEmpty().withMessage('Role is required'),
  body('statusId').notEmpty().withMessage('Status is required'),
  body('qualification').isIn(['high_value', 'low_value']).withMessage('Invalid qualification')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userData = {
      ...req.body,
      createdBy: req.user._id
    };

    const user = new User(userData);
    await user.save();
    
    const populatedUser = await User.findById(user._id)
      .populate('roleId')
      .populate('statusId')
      .populate('centreId')
      .populate('languageIds')
      .select('-password');
    
    res.status(201).json(populatedUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Remove password if empty (don't update)
    if (!updateData.password) {
      delete updateData.password;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    .populate('roleId')
    .populate('statusId')
    .populate('centreId')
    .populate('languageIds')
    .select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload profile image
router.post('/:id/profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '../uploads/profiles', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user with new profile image
    user.profileImage = req.file.filename;
    await user.save();

    res.json({ 
      message: 'Profile image uploaded successfully',
      profileImage: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve profile images
router.get('/profile-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/profiles', filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Export Route (JSON for CSV)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    console.log('Users export endpoint hit');
    const users = await User.find({ deletedAt: null })
      .populate('roleId', 'name')
      .populate('statusId', 'name')
      .populate('centreId', 'name')
      .populate('languageIds', 'name')
      .select('-password')
      .sort({ createdAt: -1 });
    
    console.log('Found users:', users.length);
    const csvData = users.map(user => ({
      'Name': user.name,
      'Email': user.email,
      'Mobile Number': user.mobileNumber,
      'Designation': user.designation,
      'Role': user.roleId?.name || '',
      'Status': user.statusId?.name || '',
      'Centre': user.centreId?.name || '',
      'Languages': user.languageIds?.map(lang => lang.name).join(', ') || '',
      'Qualification': user.qualification,
      'Created': user.createdAt
    }));
    
    console.log('Sending CSV data:', csvData.length, 'records');
    res.json(csvData);
  } catch (error) {
    console.error('Users export error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;