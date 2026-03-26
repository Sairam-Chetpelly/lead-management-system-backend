const Keyword = require('../models/Keyword');
const { successResponse, errorResponse } = require('../utils/response');

// Create keyword
exports.createKeyword = async (req, res) => {
  try {
    const { name } = req.body;
    
    const existing = await Keyword.findOne({ name: name.toLowerCase() });
    if (existing) {
      return errorResponse(res, 'Keyword already exists', 400);
    }

    const keyword = await Keyword.create({ name: name.toLowerCase() });
    return successResponse(res, keyword, 'Keyword created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get all keywords with pagination and filters
exports.getAllKeywords = async (req, res) => {
  try {
    const { page, limit, search = '', sortBy = 'usageCount', sortOrder = 'desc' } = req.query;
    
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (!page && !limit) {
      const keywords = await Keyword.find(query).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });
      return successResponse(res, { keywords }, 'Keywords retrieved successfully');
    }
    
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const keywords = await Keyword.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Keyword.countDocuments(query);
    
    return successResponse(res, {
      keywords,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Keywords retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get single keyword
exports.getKeyword = async (req, res) => {
  try {
    const keyword = await Keyword.findById(req.params.id);
    if (!keyword) {
      return errorResponse(res, 'Keyword not found', 404);
    }
    return successResponse(res, keyword, 'Keyword retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update keyword
exports.updateKeyword = async (req, res) => {
  try {
    const { name } = req.body;
    
    const existing = await Keyword.findOne({ 
      name: name.toLowerCase(), 
      _id: { $ne: req.params.id } 
    });
    if (existing) {
      return errorResponse(res, 'Keyword already exists', 400);
    }

    const keyword = await Keyword.findByIdAndUpdate(
      req.params.id,
      { name: name.toLowerCase() },
      { new: true }
    );
    
    if (!keyword) {
      return errorResponse(res, 'Keyword not found', 404);
    }
    return successResponse(res, keyword, 'Keyword updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete keyword
exports.deleteKeyword = async (req, res) => {
  try {
    const keyword = await Keyword.findByIdAndDelete(req.params.id);
    if (!keyword) {
      return errorResponse(res, 'Keyword not found', 404);
    }
    return successResponse(res, null, 'Keyword deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
