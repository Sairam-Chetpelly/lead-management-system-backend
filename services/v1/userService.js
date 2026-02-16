const User = require('../../models/User');
const bcrypt = require('bcryptjs');

class UserService {
  async getAllUsers(filters = {}) {
    const query = { isDeleted: false };
    if (filters.status) query.status = filters.status;
    if (filters.role) query.role = filters.role;
    if (filters.centre) query.centre = filters.centre;

    return await User.find(query)
      .populate('role', 'name')
      .populate('centre', 'name')
      .populate('languages', 'name')
      .select('-password')
      .sort({ createdAt: -1 });
  }

  async getUserById(id) {
    const user = await User.findOne({ _id: id, isDeleted: false })
      .populate('role', 'name permissions')
      .populate('centre', 'name')
      .populate('languages', 'name')
      .select('-password');

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  }

  async createUser(userData) {
    const existingUser = await User.findOne({ email: userData.email, isDeleted: false });
    if (existingUser) {
      throw { statusCode: 400, message: 'User with this email already exists' };
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = new User({ ...userData, password: hashedPassword });
    await user.save();

    return await this.getUserById(user._id);
  }

  async updateUser(id, updateData) {
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return await this.getUserById(id);
  }

  async deleteUser(id) {
    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return true;
  }
}

module.exports = new UserService();
