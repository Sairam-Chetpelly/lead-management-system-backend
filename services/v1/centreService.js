const Centre = require('../../models/Centre');
const User = require('../../models/User');
const Lead = require('../../models/Lead');
const LeadActivity = require('../../models/LeadActivity');

class CentreService {
  async getAll(page, limit, search) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [centres, total] = await Promise.all([
      Centre.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Centre.countDocuments(filter)
    ]);

    const data = await Promise.all(
      centres.map(async (centre) => {
        const [userCount, leadCount] = await Promise.all([
          User.countDocuments({ centreId: centre._id, deletedAt: null }),
          Lead.countDocuments({ centreId: centre._id, deletedAt: null })
        ]);
        return { ...centre.toObject(), userCount, leadCount };
      })
    );

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getAllSimple() {
    return await Centre.find({ deletedAt: null }).sort({ name: 1 });
  }

  async create(data) {
    const centre = new Centre(data);
    await centre.save();
    return centre;
  }

  async update(id, data) {
    const centre = await Centre.findByIdAndUpdate(id, data, { new: true });
    if (!centre || centre.deletedAt) {
      throw { statusCode: 404, message: 'Centre not found' };
    }
    return centre;
  }

  async delete(id) {
    const centre = await Centre.findById(id);
    if (!centre || centre.deletedAt) {
      throw { statusCode: 404, message: 'Centre not found' };
    }

    const [userCount, leadCount] = await Promise.all([
      User.countDocuments({ centreId: id, deletedAt: null }),
      LeadActivity.countDocuments({ centreId: id, deletedAt: null })
    ]);

    if (userCount > 0 || leadCount > 0) {
      const relations = [];
      if (userCount > 0) relations.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
      if (leadCount > 0) relations.push(`${leadCount} lead${leadCount > 1 ? 's' : ''}`);
      throw { statusCode: 400, message: `Cannot delete centre "${centre.name}". This centre has ${relations.join(' and ')}. Please reassign or remove them first.` };
    }

    await Centre.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: 'Centre deleted successfully' };
  }

  async export() {
    const centres = await Centre.find({ deletedAt: null }).sort({ createdAt: -1 });
    return await Promise.all(
      centres.map(async (centre) => {
        const [userCount, leadCount] = await Promise.all([
          User.countDocuments({ centreId: centre._id, deletedAt: null }),
          Lead.countDocuments({ centreId: centre._id, deletedAt: null })
        ]);
        return {
          'Name': centre.name,
          'Slug': centre.slug,
          'User Count': userCount,
          'Lead Count': leadCount,
          'Created': centre.createdAt
        };
      })
    );
  }
}

module.exports = new CentreService();
