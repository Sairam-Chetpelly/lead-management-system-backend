const LeadSource = require('../../models/LeadSource');
const LeadActivity = require('../../models/LeadActivity');

class LeadSourceService {
  async getAll(page, limit, search, isApiSource) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (isApiSource !== '') filter.isApiSource = isApiSource === 'true';

    const skip = (page - 1) * limit;
    const [leadSources, total] = await Promise.all([
      LeadSource.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      LeadSource.countDocuments(filter)
    ]);

    const data = await Promise.all(
      leadSources.map(async (source) => {
        const leadCount = await LeadActivity.countDocuments({ sourceId: source._id, deletedAt: null });
        return { ...source.toObject(), leadCount };
      })
    );

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getAllSimple() {
    return await LeadSource.find({ deletedAt: null }).select('_id name slug').sort({ name: 1 });
  }

  async getById(id) {
    const leadSource = await LeadSource.findById(id);
    if (!leadSource || leadSource.deletedAt) {
      throw { statusCode: 404, message: 'Lead source not found' };
    }
    return leadSource;
  }

  async create(data) {
    const leadSource = new LeadSource(data);
    await leadSource.save();
    return leadSource;
  }

  async update(id, data) {
    const leadSource = await LeadSource.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!leadSource || leadSource.deletedAt) {
      throw { statusCode: 404, message: 'Lead source not found' };
    }
    return leadSource;
  }

  async delete(id) {
    const leadSource = await LeadSource.findById(id);
    if (!leadSource || leadSource.deletedAt) {
      throw { statusCode: 404, message: 'Lead source not found' };
    }

    const leadCount = await LeadActivity.countDocuments({ sourceId: id, deletedAt: null });
    if (leadCount > 0) {
      throw { statusCode: 400, message: `Cannot delete lead source "${leadSource.name}". This lead source has ${leadCount} lead${leadCount > 1 ? 's' : ''}. Please reassign or remove them first.` };
    }

    await LeadSource.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: 'Lead source deleted successfully' };
  }

  async export() {
    const leadSources = await LeadSource.find({ deletedAt: null }).sort({ createdAt: -1 });
    return await Promise.all(
      leadSources.map(async (source) => {
        const leadCount = await LeadActivity.countDocuments({ sourceId: source._id, deletedAt: null });
        return {
          'Name': source.name,
          'Slug': source.slug,
          'Description': source.description,
          'Type': source.isApiSource ? 'API' : 'Manual',
          'Lead Count': leadCount,
          'Created': source.createdAt
        };
      })
    );
  }
}

module.exports = new LeadSourceService();
