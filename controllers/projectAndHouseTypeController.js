const ProjectAndHouseType = require('../models/ProjectAndHouseType');
const LeadActivity = require('../models/LeadActivity');
const { successResponse, errorResponse } = require('../utils/response');

// Export as CSV
exports.exportCSV = async (req, res) => {
  try {
    const { search = '', type = '' } = req.query;
    const filter = { deletedAt: null };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) filter.type = type;
    
    const types = await ProjectAndHouseType.find(filter).sort({ createdAt: -1 });
    
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
    
    let csv = 'Name,Type,Description,Created\n';
    
    types.forEach(type => {
      const name = cleanText(type.name);
      const typeValue = cleanText(type.type);
      const description = cleanText(type.description);
      const created = type.createdAt ? new Date(type.createdAt).toLocaleString() : '';
      
      csv += `${name},${typeValue},${description},${created}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=project-house-types.csv');
    return res.send(csv);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Export as JSON
exports.exportJSON = async (req, res) => {
  try {
    const types = await ProjectAndHouseType.find({ deletedAt: null })
      .sort({ createdAt: -1 });
    
    const csvData = types.map(type => ({
      'Name': type.name,
      'Type': type.type,
      'Description': type.description,
      'Created': type.createdAt
    }));
    
    return successResponse(res, csvData, 'Project and house types exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get all with pagination and filtering
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    
    const filter = { deletedAt: null };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) filter.type = type;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [types, total] = await Promise.all([
      ProjectAndHouseType.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      ProjectAndHouseType.countDocuments(filter)
    ]);
    
    return successResponse(res, {
      types,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Project and house types retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get by ID
exports.getById = async (req, res) => {
  try {
    const type = await ProjectAndHouseType.findById(req.params.id);
    if (!type || type.deletedAt) {
      return errorResponse(res, 'Type not found', 404);
    }
    return successResponse(res, type, 'Type retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Create
exports.create = async (req, res) => {
  try {
    const type = new ProjectAndHouseType(req.body);
    const savedType = await type.save();
    return successResponse(res, savedType, 'Type created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const type = await ProjectAndHouseType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!type || type.deletedAt) {
      return errorResponse(res, 'Type not found', 404);
    }
    return successResponse(res, type, 'Type updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

// Delete (soft delete)
exports.delete = async (req, res) => {
  try {
    const typeId = req.params.id;
    
    const type = await ProjectAndHouseType.findById(typeId);
    if (!type || type.deletedAt) {
      return errorResponse(res, 'Type not found', 404);
    }
    
    const leadCount = await LeadActivity.countDocuments({ 
      $or: [
        { projectTypeId: typeId },
        { houseTypeId: typeId }
      ],
      deletedAt: null 
    });
    
    if (leadCount > 0) {
      return errorResponse(res, `Cannot delete ${type.type} "${type.name}". This ${type.type} has ${leadCount} lead${leadCount > 1 ? 's' : ''}. Please reassign or remove them first.`, 400);
    }
    
    await ProjectAndHouseType.findByIdAndUpdate(
      typeId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    return successResponse(res, null, `${type.type} deleted successfully`, 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
