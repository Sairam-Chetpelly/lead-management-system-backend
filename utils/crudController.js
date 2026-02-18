const { validationResult } = require('express-validator');
const { successResponse, errorResponse } = require('./response');

/**
 * Generic CRUD controller factory
 * @param {Object} Model - Mongoose model
 * @param {string} entityName - Name of the entity (for error messages)
 * @param {Array} csvFields - Fields to include in CSV export
 * @returns {Object} CRUD operations
 */
const createCrudController = (Model, entityName, csvFields = []) => {
  return {
    // Get all items with pagination and search
    getAll: async (req, res) => {
      try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        const filter = { deletedAt: null };
        if (search) {
          const searchFields = ['name', 'slug', 'code', 'type'].filter(field => 
            Model.schema.paths[field]
          );
          if (searchFields.length > 0) {
            filter.$or = searchFields.map(field => ({
              [field]: { $regex: search, $options: 'i' }
            }));
          }
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [items, total] = await Promise.all([
          Model.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }),
          Model.countDocuments(filter)
        ]);
        
        const pluralName = entityName.toLowerCase().endsWith('s') 
          ? entityName.toLowerCase() + 'es'
          : entityName.toLowerCase() + 's';
        
        return successResponse(res, {
          [pluralName]: items,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        }, `${entityName}s retrieved successfully`);
      } catch (error) {
        return errorResponse(res, error.message, 500);
      }
    },

    // Get all items without pagination (for dropdowns)
    getAllSimple: async (req, res) => {
      try {
        const items = await Model.find({ deletedAt: null })
          .select('_id name slug code type')
          .sort({ name: 1 });
        return successResponse(res, items, `${entityName}s retrieved successfully`);
      } catch (error) {
        return errorResponse(res, error.message, 500);
      }
    },

    // Get single item by ID
    getById: async (req, res) => {
      try {
        const item = await Model.findById(req.params.id);
        if (!item || item.deletedAt) {
          return errorResponse(res, `${entityName} not found`, 404);
        }
        return successResponse(res, item, `${entityName} retrieved successfully`);
      } catch (error) {
        return errorResponse(res, error.message, 500);
      }
    },

    // Create new item
    create: async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return errorResponse(res, 'Validation failed', 400, errors.array());
        }

        const item = new Model(req.body);
        await item.save();
        return successResponse(res, item, `${entityName} created successfully`, 201);
      } catch (error) {
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return errorResponse(res, `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 400);
        }
        return errorResponse(res, error.message, 400);
      }
    },

    // Update item
    update: async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return errorResponse(res, 'Validation failed', 400, errors.array());
        }

        const item = await Model.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );
        
        if (!item || item.deletedAt) {
          return errorResponse(res, `${entityName} not found`, 404);
        }
        
        return successResponse(res, item, `${entityName} updated successfully`);
      } catch (error) {
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return errorResponse(res, `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 400);
        }
        return errorResponse(res, error.message, 400);
      }
    },

    // Soft delete item
    delete: async (req, res) => {
      try {
        const item = await Model.findByIdAndUpdate(
          req.params.id,
          { deletedAt: new Date() },
          { new: true }
        );
        
        if (!item) {
          return errorResponse(res, `${entityName} not found`, 404);
        }
        
        return successResponse(res, null, `${entityName} deleted successfully`);
      } catch (error) {
        return errorResponse(res, error.message, 400);
      }
    },

    // Export to CSV
    export: async (req, res) => {
      try {
        const items = await Model.find({ deletedAt: null })
          .sort({ createdAt: -1 });
        
        const csvData = items.map(item => {
          const row = {};
          csvFields.forEach(field => {
            if (field.key && field.label) {
              row[field.label] = item[field.key] || '';
            }
          });
          row['Created'] = item.createdAt;
          return row;
        });
        
        return successResponse(res, csvData, `${entityName}s exported successfully`);
      } catch (error) {
        return errorResponse(res, error.message, 500);
      }
    }
  };
};

module.exports = createCrudController;