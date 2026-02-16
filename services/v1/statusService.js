const Status = require('../../models/Status');
const User = require('../../models/User');
const LeadActivity = require('../../models/LeadActivity');

class StatusService {
  async getAll(page, limit, search) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Status.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Status.countDocuments(filter)
    ]);

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getAllSimple() {
    return await Status.find({ deletedAt: null }).sort({ name: 1 });
  }

  async create(data) {
    const status = new Status(data);
    await status.save();
    return status;
  }

  async update(id, data) {
    const status = await Status.findByIdAndUpdate(id, data, { new: true });
    if (!status || status.deletedAt) {
      throw { statusCode: 404, message: 'Status not found' };
    }
    return status;
  }

  async delete(id) {
    const status = await Status.findById(id);
    if (!status || status.deletedAt) {
      throw { statusCode: 404, message: 'Status not found' };
    }

    const [userCount, leadCount] = await Promise.all([
      User.countDocuments({ statusId: id, deletedAt: null }),
      LeadActivity.countDocuments({ $or: [{ leadStatusId: id }, { leadSubStatusId: id }], deletedAt: null })
    ]);

    if (userCount > 0 || leadCount > 0) {
      const relations = [];
      if (userCount > 0) relations.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
      if (leadCount > 0) relations.push(`${leadCount} lead${leadCount > 1 ? 's' : ''}`);
      throw { statusCode: 400, message: `Cannot delete status "${status.name}". This status has ${relations.join(' and ')}. Please reassign or remove them first.` };
    }

    await Status.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: 'Status deleted successfully' };
  }

  async export() {
    const statuses = await Status.find({ deletedAt: null }).sort({ createdAt: -1 });
    return statuses.map(status => ({
      'Name': status.name,
      'Slug': status.slug,
      'Type': status.type,
      'Description': status.description,
      'Created': status.createdAt
    }));
  }
}

module.exports = new StatusService();
