const ProjectAndHouseType = require('../../models/ProjectAndHouseType');
const LeadActivity = require('../../models/LeadActivity');

class ProjectAndHouseTypeService {
  async getAll(page, limit, search, type) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      ProjectAndHouseType.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      ProjectAndHouseType.countDocuments(filter)
    ]);

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getById(id) {
    const type = await ProjectAndHouseType.findById(id);
    if (!type || type.deletedAt) {
      throw { statusCode: 404, message: 'Type not found' };
    }
    return type;
  }

  async create(data) {
    const type = new ProjectAndHouseType(data);
    await type.save();
    return type;
  }

  async update(id, data) {
    const type = await ProjectAndHouseType.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!type || type.deletedAt) {
      throw { statusCode: 404, message: 'Type not found' };
    }
    return type;
  }

  async delete(id) {
    const type = await ProjectAndHouseType.findById(id);
    if (!type || type.deletedAt) {
      throw { statusCode: 404, message: 'Type not found' };
    }

    const leadCount = await LeadActivity.countDocuments({
      $or: [{ projectTypeId: id }, { houseTypeId: id }],
      deletedAt: null
    });

    if (leadCount > 0) {
      throw { statusCode: 400, message: `Cannot delete ${type.type} "${type.name}". This ${type.type} has ${leadCount} lead${leadCount > 1 ? 's' : ''}. Please reassign or remove them first.` };
    }

    await ProjectAndHouseType.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: `${type.type} deleted successfully` };
  }

  async export() {
    const types = await ProjectAndHouseType.find({ deletedAt: null }).sort({ createdAt: -1 });
    return types.map(type => ({
      'Name': type.name,
      'Type': type.type,
      'Description': type.description,
      'Created': type.createdAt
    }));
  }
}

module.exports = new ProjectAndHouseTypeService();
