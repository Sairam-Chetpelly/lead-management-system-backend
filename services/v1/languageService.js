const Language = require('../../models/Language');
const User = require('../../models/User');
const LeadActivity = require('../../models/LeadActivity');

class LanguageService {
  async getAll(page, limit, search) {
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [languages, total] = await Promise.all([
      Language.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Language.countDocuments(filter)
    ]);

    const data = await Promise.all(
      languages.map(async (language) => {
        const [userCount, leadCount] = await Promise.all([
          User.countDocuments({ languageIds: language._id, deletedAt: null }),
          LeadActivity.countDocuments({ languageId: language._id, deletedAt: null })
        ]);
        return { ...language.toObject(), userCount, leadCount };
      })
    );

    return { data, total, page, pages: Math.ceil(total / limit), limit };
  }

  async getAllSimple() {
    return await Language.find({ deletedAt: null }).sort({ name: 1 });
  }

  async create(data) {
    const language = new Language(data);
    await language.save();
    return language;
  }

  async update(id, data) {
    const language = await Language.findByIdAndUpdate(id, data, { new: true });
    if (!language || language.deletedAt) {
      throw { statusCode: 404, message: 'Language not found' };
    }
    return language;
  }

  async delete(id) {
    const language = await Language.findById(id);
    if (!language || language.deletedAt) {
      throw { statusCode: 404, message: 'Language not found' };
    }

    const [userCount, leadCount] = await Promise.all([
      User.countDocuments({ languageIds: id, deletedAt: null }),
      LeadActivity.countDocuments({ languageId: id, deletedAt: null })
    ]);

    if (userCount > 0 || leadCount > 0) {
      const relations = [];
      if (userCount > 0) relations.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
      if (leadCount > 0) relations.push(`${leadCount} lead${leadCount > 1 ? 's' : ''}`);
      throw { statusCode: 400, message: `Cannot delete language "${language.name}". This language has ${relations.join(' and ')}. Please reassign or remove them first.` };
    }

    await Language.findByIdAndUpdate(id, { deletedAt: new Date() });
    return { message: 'Language deleted successfully' };
  }

  async export() {
    const languages = await Language.find({ deletedAt: null }).sort({ createdAt: -1 });
    return await Promise.all(
      languages.map(async (language) => {
        const [userCount, leadCount] = await Promise.all([
          User.countDocuments({ languageIds: language._id, deletedAt: null }),
          LeadActivity.countDocuments({ languageId: language._id, deletedAt: null })
        ]);
        return {
          'Name': language.name,
          'Slug': language.slug,
          'Code': language.code,
          'User Count': userCount,
          'Lead Count': leadCount,
          'Created': language.createdAt
        };
      })
    );
  }
}

module.exports = new LanguageService();
