const { validationResult } = require('express-validator');

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
        
        res.json({
          data: items,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total,
            limit: parseInt(limit)
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },

    // Get all items without pagination (for dropdowns)
    getAllSimple: async (req, res) => {
      try {
        const items = await Model.find({ deletedAt: null })
          .select('_id name slug code type')
          .sort({ name: 1 });
        res.json({ data: items });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },

    // Get single item by ID
    getById: async (req, res) => {
      try {
        const item = await Model.findById(req.params.id);
        if (!item || item.deletedAt) {
          return res.status(404).json({ error: `${entityName} not found` });
        }
        res.json(item);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    },

    // Create new item
    create: async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const item = new Model(req.body);
        await item.save();
        res.status(201).json(item);
      } catch (error) {
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return res.status(400).json({ 
            error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
          });
        }
        res.status(400).json({ error: error.message });
      }
    },

    // Update item
    update: async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const item = await Model.findByIdAndUpdate(
          req.params.id,
          req.body,
          { new: true, runValidators: true }
        );
        
        if (!item || item.deletedAt) {
          return res.status(404).json({ error: `${entityName} not found` });
        }
        
        res.json(item);
      } catch (error) {
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return res.status(400).json({ 
            error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
          });
        }
        res.status(400).json({ error: error.message });
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
          return res.status(404).json({ error: `${entityName} not found` });
        }
        
        res.json({ message: `${entityName} deleted successfully` });
      } catch (error) {
        res.status(400).json({ error: error.message });
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
        
        res.json(csvData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  };
};

module.exports = createCrudController;