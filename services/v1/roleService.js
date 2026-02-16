const Role = require('../../models/Role');

class RoleService {
  async getAll(page, limit, search) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Role.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Role.countDocuments(filter)
    ]);

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getAllSimple() {
    return await Role.find({ deletedAt: null }).sort({ name: 1 });
  }

  async create(data) {
    const role = new Role(data);
    await role.save();
    return role;
  }

  async update(id, data) {
    const role = await Role.findByIdAndUpdate(id, data, { new: true });
    if (!role || role.deletedAt) {
      throw { statusCode: 404, message: 'Role not found' };
    }
    return role;
  }

  async delete(id) {
    const role = await Role.findById(id);
    if (!role || role.deletedAt) {
      throw { statusCode: 404, message: 'Role not found' };
    }
    await Role.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: 'Role deleted successfully' };
  }

  async export() {
    const roles = await Role.find({ deletedAt: null }).sort({ createdAt: -1 });
    return roles.map(role => ({
      'Name': role.name,
      'Slug': role.slug,
      'Created': role.createdAt
    }));
  }
}

module.exports = new RoleService();
