const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Role = require('../models/Role');
const Status = require('../models/Status');
const Centre = require('../models/Centre');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const router = express.Router();
const Lead = require('../models/Lead');

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
    
    // Get requesting user's role
    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;
    
    // Build filter query
    const filter = { deletedAt: null };
    
    // Filter users based on requesting user's role
    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const presalesRoles = await Role.find({ 
        slug: { $in: ['presales_agent', 'hod_presales', 'manager_presales'] }
      });
      const presalesRoleIds = presalesRoles.map(role => role._id);
      filter.roleId = { $in: presalesRoleIds };
    } else if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
      // HOD sales and sales manager can only see users from their center
      filter.centreId = requestingUser.centreId;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      // If role is a slug, find the role by slug first
      if (typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) {
          filter.roleId = roleDoc._id;
        }
      } else {
        filter.roleId = role;
      }
    }
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
    
    // Get lead counts for sales and presales agents
    const usersWithLeadCounts = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        // Only get lead counts for sales and presales agents
        if (['sales_agent', 'presales_agent'].includes(user.roleId.slug)) {
          // Get latest lead activity for each unique lead assigned to this user
          const pipeline = [
            { $match: { deletedAt: null } },
            { $sort: { createdAt: -1 } },
            {
              $match: {
                $or: [
                  { presalesUserId: user._id },
                  { salesUserId: user._id }
                ]
              }
            },
            { $count: 'total' }
          ];
          
          const result = await Lead.aggregate(pipeline);
          userObj.leadCount = result.length > 0 ? result[0].total : 0;
        } else {
          userObj.leadCount = 0;
        }
        
        return userObj;
      })
    );
    
    return successResponse(res, {
      users: usersWithLeadCounts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Users retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '', centre = '' } = req.query;
    
    // Get requesting user's role
    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;
    
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
    
    if (role) {
      // If role is a slug, find the role by slug first
      if (typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) {
          filter.roleId = roleDoc._id;
        }
      } else {
        filter.roleId = role;
      }
    }
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
    
    // Get lead counts for sales and presales agents
    const usersWithLeadCounts = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        
        // Only get lead counts for sales and presales agents
        if (['sales_agent', 'presales_agent'].includes(user.roleId.slug)) {
          // Get latest lead activity for each unique lead assigned to this user
          const pipeline = [
            { $match: { deletedAt: null } },
            { $sort: { createdAt: -1 } },
            {
              $match: {
                $or: [
                  { presalesUserId: user._id },
                  { salesUserId: user._id }
                ]
              }
            },
            { $count: 'total' }
          ];
          
          const result = await Lead.aggregate(pipeline);
          userObj.leadCount = result.length > 0 ? result[0].total : 0;
        } else {
          userObj.leadCount = 0;
        }
        
        return userObj;
      })
    );
    
    return successResponse(res, {
      users: usersWithLeadCounts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Users retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
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
  body('qualification').isIn(['high_value', 'low_value']).withMessage('Invalid qualification'),
  body('userType').custom(async (value, { req }) => {
    const role = await Role.findById(req.body.roleId);
    if (role && role.slug === 'presales_agent') {
      console.log('Validating user type for presales agent');
      if (!value || !['regular', 'cp_presales'].includes(value)) {
        throw new Error('User type is required for presales agents');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    // Get requesting user's role and center
    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;
    
    const userData = {
      ...req.body,
      createdBy: req.user._id
    };
    
    // HOD sales and sales manager can only create users in their center and with sales roles
    if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
      userData.centreId = requestingUser.centreId;
      
      // Validate role is sales-related
      const targetRole = await Role.findById(userData.roleId);
      if (!targetRole || !['hod_sales', 'sales_manager', 'sales_agent'].includes(targetRole.slug)) {
        return errorResponse(res, 'Can only create sales-related users', 403);
      }
    }
    
    // HOD presales and manager presales can only create presales roles
    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const targetRole = await Role.findById(userData.roleId);
      if (!targetRole || !['presales_agent', 'hod_presales', 'manager_presales'].includes(targetRole.slug)) {
        return errorResponse(res, 'Can only create presales-related users', 403);
      }
    }
    
    // Remove empty userType to prevent enum validation error
    if (!userData.userType) {
      delete userData.userType;
    }

    const user = new User(userData);
    await user.save();
    
    const populatedUser = await User.findById(user._id)
      .populate('roleId')
      .populate('statusId')
      .populate('centreId')
      .populate('languageIds')
      .select('-password');
    
    return successResponse(res, populatedUser, 'User created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Email already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
});

// Update user (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Get requesting user's role and center
    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;
    
    // Check if HOD sales or sales manager is trying to update user from different center
    if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser || !targetUser.centreId.equals(requestingUser.centreId)) {
        return errorResponse(res, 'Access denied: Can only update users from your center', 403);
      }
    }
    
    // Check if HOD presales or manager presales is trying to update non-presales user
    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const targetUser = await User.findById(req.params.id).populate('roleId');
      if (!targetUser || !['presales_agent', 'hod_presales', 'manager_presales'].includes(targetUser.roleId.slug)) {
        return errorResponse(res, 'Access denied: Can only update presales users', 403);
      }
    }
    
    const updateData = { ...req.body };
    
    // Remove password if empty (don't update)
    if (!updateData.password) {
      delete updateData.password;
    }
    
    // HOD sales and sales manager cannot change center
    if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
      delete updateData.centreId;
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    Object.assign(user, updateData);
    await user.save();
    
    const updatedUser = await User.findById(user._id)
      .populate('roleId')
      .populate('statusId')
      .populate('centreId')
      .populate('languageIds')
      .select('-password');
    
    return successResponse(res, updatedUser, 'User updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
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
      return errorResponse(res, 'User not found', 404);
    }
    
    return successResponse(res, null, 'User deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

// Upload profile image
router.post('/:id/profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
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

    return successResponse(res, { profileImage: req.file.filename }, 'Profile image uploaded successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Serve profile images
router.get('/profile-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/profiles', filename);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    return errorResponse(res, 'Image not found', 404);
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
      'User Type': user.userType || '',
      'Created': user.createdAt
    }));
    
    console.log('Sending CSV data:', csvData.length, 'records');
    return successResponse(res, csvData, 'Users exported successfully', 200);
  } catch (error) {
    console.error('Users export error:', error);
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
