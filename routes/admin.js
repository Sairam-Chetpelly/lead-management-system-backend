const express = require('express');
const { body } = require('express-validator');
const Role = require('../models/Role');
const Centre = require('../models/Centre');
const Language = require('../models/Language');
const Status = require('../models/Status');
const User = require('../models/User');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const { authenticateToken } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const createCrudController = require('../utils/crudController');
const router = express.Router();

// Create CRUD controllers
const roleController = createCrudController(Role, 'Role', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' }
]);

const centreController = createCrudController(Centre, 'Centre', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' }
]);

const languageController = createCrudController(Language, 'Language', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'code', label: 'Code' }
]);

const statusController = createCrudController(Status, 'Status', [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' }
]);

// Get all items for dropdowns (without pagination)
router.get('/roles/all', authenticateToken, roleController.getAllSimple);
router.get('/centres/all', authenticateToken, centreController.getAllSimple);
router.get('/languages/all', authenticateToken, languageController.getAllSimple);
router.get('/statuses/all', authenticateToken, statusController.getAllSimple);

// User delete endpoint for admin
router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user || user.deletedAt) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Check for related leads
    const leadCount = await LeadActivity.countDocuments({ 
      $or: [
        { presalesUserId: userId },
        { salesUserId: userId },
        { updatedPerson: userId }
      ],
      deletedAt: null 
    });
    
    if (leadCount > 0) {
      return errorResponse(res, `Cannot delete user "${user.name}". This user has ${leadCount} lead${leadCount > 1 ? 's' : ''} assigned. Please reassign or remove them first.`, 400);
    }
    
    await User.findByIdAndUpdate(
      userId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    return successResponse(res, null, 'User deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Lead delete endpoint for admin
router.delete('/leads/:id', authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;
    
    // Try to find as LeadActivity first
    let leadActivity = await LeadActivity.findById(leadId);
    let actualLeadId = null;
    
    if (leadActivity) {
      actualLeadId = leadActivity.leadId;
    } else {
      // Try as Lead ID directly
      const lead = await Lead.findById(leadId);
      if (lead) {
        actualLeadId = lead._id;
        leadActivity = await LeadActivity.findOne({ leadId: actualLeadId, deletedAt: null });
      }
    }
    
    if (!leadActivity || leadActivity.deletedAt) {
      return errorResponse(res, 'Lead not found', 404);
    }
    
    // Soft delete all lead activities for this lead
    await LeadActivity.updateMany(
      { leadId: actualLeadId, deletedAt: null },
      { deletedAt: new Date() }
    );
    
    // Soft delete the main lead
    await Lead.findByIdAndUpdate(
      actualLeadId,
      { deletedAt: new Date() }
    );
    
    return successResponse(res, null, 'Lead deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Users endpoint for admin
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('roleId', 'name slug')
        .populate('statusId', 'name slug')
        .populate('centreId', 'name slug')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);
    
    return successResponse(res, {
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Users retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Roles CRUD with pagination
router.get('/roles', authenticateToken, roleController.getAll);
router.post('/roles', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], roleController.create);
router.put('/roles/:id', authenticateToken, roleController.update);
router.delete('/roles/:id', authenticateToken, roleController.delete);

// Centres CRUD with pagination
router.get('/centres', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [centres, total] = await Promise.all([
      Centre.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Centre.countDocuments(filter)
    ]);
    
    // Add user and lead counts for each centre
    const centresWithCounts = await Promise.all(
      centres.map(async (centre) => {
        const [userCount, leadCount] = await Promise.all([
          User.countDocuments({ centreId: centre._id, deletedAt: null }),
          Lead.countDocuments({ centreId: centre._id, deletedAt: null })
        ]);
        
        return {
          ...centre.toObject(),
          userCount,
          leadCount
        };
      })
    );
    
    return successResponse(res, {
      centres: centresWithCounts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Centres retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
router.post('/centres', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], centreController.create);
router.get('/centres/:id', authenticateToken, async (req, res) => {
  try {
    const centre = await Centre.findOne({ _id: req.params.id, deletedAt: null });
    
    if (!centre) {
      return errorResponse(res, 'Centre not found', 404);
    }
    
    const [userCount, leadCount] = await Promise.all([
      User.countDocuments({ centreId: centre._id, deletedAt: null }),
      Lead.countDocuments({ centreId: centre._id, deletedAt: null })
    ]);
    
    return successResponse(res, {
      ...centre.toObject(),
      userCount,
      leadCount
    }, 'Centre retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
router.put('/centres/:id', authenticateToken, centreController.update);
router.delete('/centres/:id', authenticateToken, async (req, res) => {
  try {
    const centreId = req.params.id;
    
    const centre = await Centre.findById(centreId);
    if (!centre || centre.deletedAt) {
      return errorResponse(res, 'Centre not found', 404);
    }
    
    const userCount = await User.countDocuments({ 
      centreId: centreId, 
      deletedAt: null 
    });
    
    const leadCount = await LeadActivity.countDocuments({ 
      centreId: centreId, 
      deletedAt: null 
    });
    
    if (userCount > 0 || leadCount > 0) {
      let message = `Cannot delete centre "${centre.name}". This centre has `;
      const relations = [];
      
      if (userCount > 0) {
        relations.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
      }
      if (leadCount > 0) {
        relations.push(`${leadCount} lead${leadCount > 1 ? 's' : ''}`);
      }
      
      message += relations.join(' and ') + '. Please reassign or remove them first.';
      
      return errorResponse(res, message, 400);
    }
    
    await Centre.findByIdAndUpdate(
      centreId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    return successResponse(res, null, 'Centre deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Languages CRUD with pagination
router.get('/languages', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const filter = { deletedAt: null };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [languages, total] = await Promise.all([
      Language.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Language.countDocuments(filter)
    ]);
    
    // Add user and lead counts for each language
    const languagesWithCounts = await Promise.all(
      languages.map(async (language) => {
        const [userCount, leadCount] = await Promise.all([
          User.countDocuments({ languageIds: language._id, deletedAt: null }),
          LeadActivity.countDocuments({ languageId: language._id, deletedAt: null })
        ]);
        
        return {
          ...language.toObject(),
          userCount,
          leadCount
        };
      })
    );
    
    return successResponse(res, {
      languages: languagesWithCounts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    }, 'Languages retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
router.get('/languages/:id', authenticateToken, async (req, res) => {
  try {
    const language = await Language.findOne({ _id: req.params.id, deletedAt: null });
    
    if (!language) {
      return errorResponse(res, 'Language not found', 404);
    }
    
    const [userCount, leadCount] = await Promise.all([
      User.countDocuments({ languageIds: language._id, deletedAt: null }),
      LeadActivity.countDocuments({ languageId: language._id, deletedAt: null })
    ]);
    
    return successResponse(res, {
      ...language.toObject(),
      userCount,
      leadCount
    }, 'Language retrieved successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
router.post('/languages', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required'),
  body('code').notEmpty().withMessage('Code is required')
], languageController.create);
router.put('/languages/:id', authenticateToken, languageController.update);
router.delete('/languages/:id', authenticateToken, async (req, res) => {
  try {
    const languageId = req.params.id;
    
    const language = await Language.findById(languageId);
    if (!language || language.deletedAt) {
      return errorResponse(res, 'Language not found', 404);
    }
    
    const userCount = await User.countDocuments({ 
      languageIds: languageId, 
      deletedAt: null 
    });
    
    const leadCount = await LeadActivity.countDocuments({ 
      languageId: languageId, 
      deletedAt: null 
    });
    
    if (userCount > 0 || leadCount > 0) {
      let message = `Cannot delete language "${language.name}". This language has `;
      const relations = [];
      
      if (userCount > 0) {
        relations.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
      }
      if (leadCount > 0) {
        relations.push(`${leadCount} lead${leadCount > 1 ? 's' : ''}`);
      }
      
      message += relations.join(' and ') + '. Please reassign or remove them first.';
      
      return errorResponse(res, message, 400);
    }
    
    await Language.findByIdAndUpdate(
      languageId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    return successResponse(res, null, 'Language deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Statuses CRUD with pagination
router.get('/statuses', authenticateToken, statusController.getAll);
router.post('/statuses', authenticateToken, [
  body('name').notEmpty().withMessage('Name is required'),
  body('slug').notEmpty().withMessage('Slug is required')
], statusController.create);
router.put('/statuses/:id', authenticateToken, statusController.update);
router.delete('/statuses/:id', authenticateToken, async (req, res) => {
  try {
    const statusId = req.params.id;
    
    const status = await Status.findById(statusId);
    if (!status || status.deletedAt) {
      return errorResponse(res, 'Status not found', 404);
    }
    
    const userCount = await User.countDocuments({ 
      statusId: statusId, 
      deletedAt: null 
    });
    
    const leadCount = await LeadActivity.countDocuments({ 
      $or: [
        { leadStatusId: statusId },
        { leadSubStatusId: statusId }
      ],
      deletedAt: null 
    });
    
    if (userCount > 0 || leadCount > 0) {
      let message = `Cannot delete status "${status.name}". This status has `;
      const relations = [];
      
      if (userCount > 0) {
        relations.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
      }
      if (leadCount > 0) {
        relations.push(`${leadCount} lead${leadCount > 1 ? 's' : ''}`);
      }
      
      message += relations.join(' and ') + '. Please reassign or remove them first.';
      
      return errorResponse(res, message, 400);
    }
    
    await Status.findByIdAndUpdate(
      statusId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    return successResponse(res, null, 'Status deleted successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// Export Routes (JSON for CSV)
router.get('/roles/export', authenticateToken, roleController.export);
router.get('/centres/export', authenticateToken, async (req, res) => {
  try {
    const centres = await Centre.find({ deletedAt: null }).sort({ createdAt: -1 });
    
    const csvData = await Promise.all(
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
    
    return successResponse(res, csvData, 'Centres exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
router.get('/languages/export', authenticateToken, async (req, res) => {
  try {
    const languages = await Language.find({ deletedAt: null }).sort({ createdAt: -1 });
    
    const csvData = await Promise.all(
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
    
    return successResponse(res, csvData, 'Languages exported successfully', 200);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});
router.get('/statuses/export', authenticateToken, statusController.export);

module.exports = router;
