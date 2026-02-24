const LeadSource = require('../models/LeadSource');
const LeadActivity = require('../models/LeadActivity');
const { successResponse, errorResponse } = require('../utils/response');

exports.exportCSV = async (req, res) => {
  try {
    const { search = '', isApiSource = '' } = req.query;
    const filter = { deletedAt: null };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isApiSource !== '') {
      filter.isApiSource = isApiSource === 'true';
    }
    
    const leadSources = await LeadSource.find(filter).sort({ createdAt: -1 });
    
    const cleanText = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,/g, '|')
        .trim();
    };
    
    const csvRows = [];
    csvRows.push('Name,Slug,Description,Type,Lead Count,Created');
    
    for (const source of leadSources) {
      const leadCount = await LeadActivity.countDocuments({ sourceId: source._id, deletedAt: null });
      const type = source.isApiSource ? 'API' : 'Manual';
      csvRows.push(`${cleanText(source.name)},${cleanText(source.slug)},${cleanText(source.description)},${cleanText(type)},${leadCount},${cleanText(source.createdAt)}`);
    }
    
    const csvContent = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=lead-sources.csv');
    res.send(csvContent);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.exportJSON = async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null }).sort({ createdAt: -1 });
    
    const csvData = await Promise.all(
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
    
    return successResponse(res, csvData, 'Lead sources exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getAllSimple = async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null })
      .select('_id name slug')
      .sort({ name: 1 });
    
    return successResponse(res, leadSources, 'Lead sources retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isApiSource = '' } = req.query;
    const filter = { deletedAt: null };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isApiSource !== '') {
      filter.isApiSource = isApiSource === 'true';
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [leadSources, total] = await Promise.all([
      LeadSource.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      LeadSource.countDocuments(filter)
    ]);
    
    const leadSourcesWithCounts = await Promise.all(
      leadSources.map(async (source) => {
        const leadCount = await LeadActivity.countDocuments({ sourceId: source._id, deletedAt: null });
        return { ...source.toObject(), leadCount };
      })
    );
    
    return successResponse(res, {
      leadSources: leadSourcesWithCounts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Lead sources retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const leadSource = await LeadSource.findById(req.params.id);
    if (!leadSource || leadSource.deletedAt) {
      return errorResponse(res, 'Lead source not found', 404);
    }
    return successResponse(res, leadSource, 'Lead source retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const leadSource = new LeadSource(req.body);
    const savedLeadSource = await leadSource.save();
    return successResponse(res, savedLeadSource, 'Lead source created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

exports.update = async (req, res) => {
  try {
    const leadSource = await LeadSource.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!leadSource || leadSource.deletedAt) {
      return errorResponse(res, 'Lead source not found', 404);
    }
    return successResponse(res, leadSource, 'Lead source updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

exports.delete = async (req, res) => {
  try {
    const sourceId = req.params.id;
    const leadSource = await LeadSource.findById(sourceId);
    
    if (!leadSource || leadSource.deletedAt) {
      return errorResponse(res, 'Lead source not found', 404);
    }
    
    const leadCount = await LeadActivity.countDocuments({ sourceId: sourceId, deletedAt: null });
    
    if (leadCount > 0) {
      return errorResponse(res, `Cannot delete lead source "${leadSource.name}". This lead source has ${leadCount} lead${leadCount > 1 ? 's' : ''}. Please reassign or remove them first.`, 400);
    }
    
    await LeadSource.findByIdAndUpdate(sourceId, { deletedAt: new Date() }, { new: true });
    
    return successResponse(res, null, 'Lead source deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
