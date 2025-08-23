const express = require('express');
const router = express.Router();
const LeadSource = require('../models/LeadSource');

// GET export lead sources
router.get('/export', async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null })
      .sort({ createdAt: -1 });
    
    const csvData = leadSources.map(source => ({
      'Name': source.name,
      'Slug': source.slug,
      'Description': source.description,
      'Type': source.isApiSource ? 'API' : 'Manual',
      'Created': source.createdAt
    }));
    
    res.json(csvData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all lead sources without pagination (for dropdowns)
router.get('/all', async (req, res) => {
  try {
    const leadSources = await LeadSource.find({ deletedAt: null })
      .select('_id name slug')
      .sort({ name: 1 });
    
    res.json(leadSources);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    
    res.json({
      data: leadSources,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET lead source by ID
router.get('/:id', async (req, res) => {
  try {
    const leadSource = await LeadSource.findById(req.params.id);
    if (!leadSource || leadSource.deletedAt) {
      return res.status(404).json({ message: 'Lead source not found' });
    }
    res.json(leadSource);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new lead source
router.post('/', async (req, res) => {
  try {
    const leadSource = new LeadSource(req.body);
    const savedLeadSource = await leadSource.save();
    res.status(201).json(savedLeadSource);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
      return res.status(404).json({ message: 'Lead source not found' });
    }
    res.json(leadSource);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE lead source (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const sourceId = req.params.id;
    
    const leadSource = await LeadSource.findById(sourceId);
    if (!leadSource || leadSource.deletedAt) {
      return res.status(404).json({ message: 'Lead source not found' });
    }
    
    const LeadActivity = require('../models/LeadActivity');
    const leadCount = await LeadActivity.countDocuments({ 
      sourceId: sourceId, 
      deletedAt: null 
    });
    
    if (leadCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete lead source "${leadSource.name}". This lead source has ${leadCount} lead${leadCount > 1 ? 's' : ''}. Please reassign or remove them first.` 
      });
    }
    
    await LeadSource.findByIdAndUpdate(
      sourceId,
      { deletedAt: new Date() },
      { new: true }
    );
    
    res.json({ message: 'Lead source deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;