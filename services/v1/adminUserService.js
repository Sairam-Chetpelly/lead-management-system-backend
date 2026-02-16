const User = require('../../models/User');
const LeadActivity = require('../../models/LeadActivity');

class AdminUserService {
  async getAll(page, limit, search) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      User.find(filter)
        .populate('roleId', 'name slug')
        .populate('statusId', 'name slug')
        .populate('centreId', 'name slug')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async delete(id) {
    const user = await User.findById(id);
    if (!user || user.deletedAt) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const leadCount = await LeadActivity.countDocuments({
      $or: [
        { presalesUserId: id },
        { salesUserId: id },
        { updatedPerson: id }
      ],
      deletedAt: null
    });

    if (leadCount > 0) {
      throw { statusCode: 400, message: `Cannot delete user "${user.name}". This user has ${leadCount} lead${leadCount > 1 ? 's' : ''} assigned. Please reassign or remove them first.` };
    }

    await User.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: 'User deleted successfully' };
  }
}

module.exports = new AdminUserService();
