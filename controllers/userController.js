const User = require('../models/User');
const Role = require('../models/Role');
const Lead = require('../models/Lead');
const { successResponse, errorResponse } = require('../utils/response');
const { validationResult } = require('express-validator');
const Centre = require('../models/Centre');
const path = require('path');
const fs = require('fs');

// Get all users with pagination and filtering
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '', centre = '' } = req.query;

    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;

    const filter = { deletedAt: null };

    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const presalesRoles = await Role.find({
        slug: { $in: ['presales_agent', 'hod_presales', 'manager_presales'] }
      });
      filter.roleId = { $in: presalesRoles.map(role => role._id) };
    } else if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
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
      if (typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) filter.roleId = roleDoc._id;
      } else {
        filter.roleId = role;
      }
    }
    if (status) filter.statusId = status;
    if (centre) filter.centreId = centre;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('roleId', 'name slug')
        .populate('statusId', 'name slug')
        .populate('centreId', 'name slug')
        .populate('languageIds', 'name slug code')
        .select('-password -resetPasswordToken -resetPasswordExpires -__v -deletedAt -resetPasswordOTP -resetPasswordOTPExpires')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    const usersWithLeadCounts = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        if (['sales_agent', 'presales_agent'].includes(user.roleId.slug)) {
          const result = await Lead.aggregate([
            { $match: { deletedAt: null } },
            { $match: { $or: [{ presalesUserId: user._id }, { salesUserId: user._id }] } },
            { $count: 'total' }
          ]);
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
};

// Get all users without role filtering
exports.getAllUnfiltered = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '', centre = '' } = req.query;

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
      if (typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) filter.roleId = roleDoc._id;
      } else {
        filter.roleId = role;
      }
    }
    if (status) filter.statusId = status;
    if (centre) filter.centreId = centre;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('roleId', 'name slug')
        .populate('statusId', 'name slug')
        .populate('centreId', 'name slug')
        .populate('languageIds', 'name slug code')
        .select('-password')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    const usersWithLeadCounts = await Promise.all(
      users.map(async (user) => {
        const userObj = user.toObject();
        if (['sales_agent', 'presales_agent'].includes(user.roleId.slug)) {
          const result = await Lead.aggregate([
            { $match: { deletedAt: null } },
            { $match: { $or: [{ presalesUserId: user._id }, { salesUserId: user._id }] } },
            { $count: 'total' }
          ]);
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
};

// Create user
exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;

    const userData = { ...req.body, createdBy: req.user._id };

    if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
      userData.centreId = requestingUser.centreId;
      const targetRole = await Role.findById(userData.roleId);
      if (!targetRole || !['hod_sales', 'sales_manager', 'sales_agent'].includes(targetRole.slug)) {
        return errorResponse(res, 'Can only create sales-related users', 403);
      }
    }

    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const targetRole = await Role.findById(userData.roleId);
      if (!targetRole || !['presales_agent', 'hod_presales', 'manager_presales'].includes(targetRole.slug)) {
        return errorResponse(res, 'Can only create presales-related users', 403);
      }
    }

    if (!userData.userType) delete userData.userType;

    const user = new User(userData);
    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('roleId', 'name slug')
      .populate('statusId', 'name slug')
      .populate('centreId', 'name slug')
      .populate('languageIds', 'name slug code')
      .select('-password');

    return successResponse(res, populatedUser, 'User created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Email already exists', 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

// Update user
exports.update = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;

    if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
      const targetUser = await User.findById(req.params.id);
      if (!targetUser || !targetUser.centreId.equals(requestingUser.centreId)) {
        return errorResponse(res, 'Access denied: Can only update users from your center', 403);
      }
    }

    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const targetUser = await User.findById(req.params.id).populate('roleId');
      if (!targetUser || !['presales_agent', 'hod_presales', 'manager_presales'].includes(targetUser.roleId.slug)) {
        return errorResponse(res, 'Access denied: Can only update presales users', 403);
      }
    }

    const updateData = { ...req.body };
    if (!updateData.password) delete updateData.password;
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
      .populate('roleId', 'name slug')
      .populate('statusId', 'name slug')
      .populate('centreId', 'name slug')
      .populate('languageIds', 'name slug code')
      .select('-password');

    return successResponse(res, updatedUser, 'User updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Delete user
exports.delete = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return errorResponse(res, 'User not found', 404);
    }
    const leadCount = await Lead.countDocuments({
      $or: [
        { presalesUserId: userId },
        { salesUserId: userId }
      ],
      deletedAt: null
    });
    if (leadCount > 0) {
      return errorResponse(res, `Cannot delete user "${user.name}". This user has ${leadCount} lead${leadCount > 1 ? 's' : ''} assigned. Please reassign or remove them first.`, 400);
    }
    await User.findByIdAndUpdate(
      userId,
      { deletedAt: new Date() },
      { new: true }
    );
    return successResponse(res, null, 'User deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No image file provided', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    if (user.profileImage) {
      const oldImagePath = path.join(__dirname, '../uploads/profiles', user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    user.profileImage = req.file.filename;
    await user.save();

    return successResponse(res, { profileImage: req.file.filename }, 'Profile image uploaded successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Serve profile image
exports.getProfileImage = (req, res) => {
  const imagePath = path.join(__dirname, '../uploads/profiles', req.params.filename);

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    return errorResponse(res, 'Image not found', 404);
  }
};

// Export CSV
exports.exportCSV = async (req, res) => {
  try {
    const { search = '', role = '', status = '', centre = '' } = req.query;

    const requestingUser = await User.findById(req.user.userId).populate('roleId');
    const requestingUserRole = requestingUser?.roleId?.slug;

    const filter = { deletedAt: null };

    if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
      const presalesRoles = await Role.find({
        slug: { $in: ['presales_agent', 'hod_presales', 'manager_presales'] }
      });
      filter.roleId = { $in: presalesRoles.map(role => role._id) };
    } else if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
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
      if (typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) filter.roleId = roleDoc._id;
      } else {
        filter.roleId = role;
      }
    }
    if (status) filter.statusId = status;
    if (centre) filter.centreId = centre;

    const users = await User.find(filter)
      .populate('roleId', 'name')
      .populate('statusId', 'name')
      .populate('centreId', 'name')
      .populate('languageIds', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    const csvRows = ['Name,Email,Mobile Number,Designation,Role,Status,Centre,Languages,Qualification,User Type,Created'];

    for (const user of users) {
      const role = user.roleId?.name || '';
      const status = user.statusId?.name || '';
      const centre = user.centreId?.name || '';
      const languages = user.languageIds?.map(lang => lang.name).join(' | ') || '';
      const userType = user.userType || '';

      csvRows.push(`${user.name},${user.email},${user.mobileNumber},${user.designation},${role},${status},${centre},${languages},${user.qualification},${userType},${user.createdAt}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_${timestamp}.csv`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Search users for dropdown (minimal data)
exports.searchDropdown = async (req, res) => {
  try {
    const { search = '', role = '', centre } = req.query;

    if (!search || search.length < 3) {
      return successResponse(res, [], 'Minimum 3 characters required', 200);
    }

    const filter = {
      deletedAt: null,
      name: { $regex: search, $options: 'i' }
    };

    if (role) {
      if (typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
        const roleDoc = await Role.findOne({ slug: role });
        if (roleDoc) filter.roleId = roleDoc._id;
      } else {
        filter.roleId = role;
      }
    }
    if (centre) {
      if (typeof centre === 'string' && !centre.match(/^[0-9a-fA-F]{24}$/)) {
        const centreDoc = await Centre.findOne({ slug: centre });
        if (centreDoc) filter.centreId = centreDoc._id;
      } else {
        filter.centreId = centre;
      }
    }

    const users = await User.find(filter)
      .select('_id name email')
      .populate('roleId', 'name slug')
      .populate('centreId', 'name slug')
      .populate('statusId', 'name slug')
      .populate('languageIds', 'name slug code')
      .limit(20)
      .sort({ name: 1 });

    return successResponse(res, users, 'Users retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
