const express = require('express');
const router = express.Router();
const LeadSource = require('../models/LeadSource');
const { successResponse, errorResponse } = require('../utils/response');

// GET export lead sources
router.get('/export', async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null })
      .sort({ createdAt: -1 });
    
    const LeadActivity = require('../models/LeadActivity');
    const csvData = await Promise.all(
      leadSources.map(async (source) => {
        const leadCount = await LeadActivity.countDocuments({ 
          sourceId: source._id, 
          deletedAt: null 
        });
        
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
});

// GET all lead sources without pagination (for dropdowns)
router.get('/all', async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null })
      .select('_id name slug')
      .sort({ name: 1 });
    
    return successResponse(res, leadSources, 'Lead sources retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// GET all lead sources with pagination and filtering
router.get('/', async (req, res) => {
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
      LeadSource.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      LeadSource.countDocuments(filter)
    ]);
    
    // Add lead count for each source
    const LeadActivity = require('../models/LeadActivity');
    const leadSourcesWithCounts = await Promise.all(
      leadSources.map(async (source) => {
        const leadCount = await LeadActivity.countDocuments({ 
          sourceId: source._id, 
          deletedAt: null 
        });
        
        return {
          ...source.toObject(),
          leadCount
        };
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
});

// GET lead source by ID
router.get('/:id', async (req, res) => {
  try {
    const leadSource = await LeadSource.findById(req.params.id);
    if (!leadSource || leadSource.deletedAt) {
      return errorResponse(res, 'Lead source not found', 404);
    }
    return successResponse(res, leadSource, 'Lead source retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// POST create new lead source
router.post('/', async (req, res) => {
  try {
    const leadSource = new LeadSource(req.body);
    const savedLeadSource = await leadSource.save();
    return successResponse(res, savedLeadSource, 'Lead source created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

// PUT update lead source
router.put('/:id', async (req, res) => {
  try {
    const leadSource = await LeadSource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!leadSource || leadSource.deletedAt) {
      return errorResponse(res, 'Lead source not found', 404);
    }
    return successResponse(res, leadSource, 'Lead source updated successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

// DELETE lead source (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const sourceId = req.params.id;
    
    const leadSource = await LeadSource.findById(sourceId);
    if (!leadSource || leadSource.deletedAt) {
      return errorResponse(res, 'Lead source not found', 404);
    }
    
    const LeadActivity = require('../models/LeadActivity');
    const leadCount = await LeadActivity.countDocuments({ 
      sourceId: sourceId, 
      deletedAt: null 
    });
    
    if (leadCount > 0) {
      return errorResponse(res, `Cannot delete lead source "${leadSource.name}". This lead source has ${leadCount} lead${leadCount > 1 ? 's' : ''}. Please reassign or remove them first.`, 400);
    }
    
    await LeadSource.findByIdAndUpdate(
      sourceId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    return successResponse(res, null, 'Lead source deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
