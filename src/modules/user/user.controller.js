const User = require('../models/User');
const Role = require('../models/Role');
const Lead = require('../models/Lead');

class UserController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search = '', role = '', status = '', centre = '' } = req.query;
      
      const requestingUser = await User.findById(req.user.userId).populate('roleId');
      const requestingUserRole = requestingUser?.roleId?.slug;
      
      const filter = { deletedAt: null };
      
      if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
        const presalesRoles = await Role.find({ 
          slug: { $in: ['presales_agent', 'hod_presales', 'manager_presales'] }
        });
        filter.roleId = { $in: presalesRoles.map(r => r._id) };
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
      
      const usersWithLeadCounts = await Promise.all(
        users.map(async (user) => {
          const userObj = user.toObject();
          
          if (['sales_agent', 'presales_agent'].includes(user.roleId.slug)) {
            const result = await Lead.aggregate([
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
            ]);
            userObj.leadCount = result.length > 0 ? result[0].total : 0;
          } else {
            userObj.leadCount = 0;
          }
          
          return userObj;
        })
      );
      
      res.json({
        data: usersWithLeadCounts,
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
  }

  async create(req, res) {
    try {
      const requestingUser = await User.findById(req.user.userId).populate('roleId');
      const requestingUserRole = requestingUser?.roleId?.slug;
      
      const userData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
        userData.centreId = requestingUser.centreId;
        
        const targetRole = await Role.findById(userData.roleId);
        if (!targetRole || !['hod_sales', 'sales_manager', 'sales_agent'].includes(targetRole.slug)) {
          return res.status(403).json({ error: 'Can only create sales-related users' });
        }
      }
      
      if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
        const targetRole = await Role.findById(userData.roleId);
        if (!targetRole || !['presales_agent', 'hod_presales', 'manager_presales'].includes(targetRole.slug)) {
          return res.status(403).json({ error: 'Can only create presales-related users' });
        }
      }
      
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
      
      res.status(201).json(populatedUser);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const requestingUser = await User.findById(req.user.userId).populate('roleId');
      const requestingUserRole = requestingUser?.roleId?.slug;
      
      if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
        const targetUser = await User.findById(req.params.id);
        if (!targetUser || !targetUser.centreId.equals(requestingUser.centreId)) {
          return res.status(403).json({ error: 'Access denied: Can only update users from your center' });
        }
      }
      
      if (requestingUserRole === 'hod_presales' || requestingUserRole === 'manager_presales') {
        const targetUser = await User.findById(req.params.id).populate('roleId');
        if (!targetUser || !['presales_agent', 'hod_presales', 'manager_presales'].includes(targetUser.roleId.slug)) {
          return res.status(403).json({ error: 'Access denied: Can only update presales users' });
        }
      }
      
      const updateData = { ...req.body };
      
      if (!updateData.password) {
        delete updateData.password;
      }
      
      if (requestingUserRole === 'hod_sales' || requestingUserRole === 'sales_manager') {
        delete updateData.centreId;
      }
      
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      Object.assign(user, updateData);
      await user.save();
      
      const updatedUser = await User.findById(user._id)
        .populate('roleId')
        .populate('statusId')
        .populate('centreId')
        .populate('languageIds')
        .select('-password');
      
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
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
  }

  async export(req, res) {
    try {
      const users = await User.find({ deletedAt: null })
        .populate('roleId', 'name')
        .populate('statusId', 'name')
        .populate('centreId', 'name')
        .populate('languageIds', 'name')
        .select('-password')
        .sort({ createdAt: -1 });
      
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
      
      res.json(csvData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
