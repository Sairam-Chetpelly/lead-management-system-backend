const express = require('express');
const { body, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const User = require('../models/User');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// Get all users with pagination and filtering (Admin only)
router.get('/', auth, adminOnly, async (req, res) => {
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
router.post('/', auth, adminOnly, [
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
router.put('/:id', auth, adminOnly, async (req, res) => {
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
router.delete('/:id', auth, adminOnly, async (req, res) => {
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

// Excel Export Route
router.get('/export', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ deletedAt: null })
      .populate('roleId', 'name')
      .populate('statusId', 'name')
      .populate('centreId', 'name')
      .populate('languageIds', 'name')
      .select('-password')
      .sort({ createdAt: -1 });
    
    const worksheet = XLSX.utils.json_to_sheet(users.map(user => ({
      Name: user.name,
      Email: user.email,
      'Mobile Number': user.mobileNumber,
      Designation: user.designation,
      Role: user.roleId?.name || '',
      Status: user.statusId?.name || '',
      Centre: user.centreId?.name || '',
      Languages: user.languageIds?.map(lang => lang.name).join(', ') || '',
      Qualification: user.qualification,
      'Created At': new Date(user.createdAt).toLocaleDateString()
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;