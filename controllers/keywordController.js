const Keyword = require('../models/Keyword');

// Create keyword
exports.createKeyword = async (req, res) => {
  try {
    const { name } = req.body;
    
    const existing = await Keyword.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Keyword already exists' });
    }

    const keyword = await Keyword.create({ name: name.toLowerCase() });
    res.status(201).json(keyword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all keywords with pagination and filters
exports.getAllKeywords = async (req, res) => {
  try {
    const { page, limit, search = '', sortBy = 'usageCount', sortOrder = 'desc' } = req.query;
    
    const query = {};
    
    // Search filter
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    // If no pagination params, return all keywords
    if (!page && !limit) {
      const keywords = await Keyword.find(query).sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });
      return res.json({ keywords });
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const keywords = await Keyword.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Keyword.countDocuments(query);
    
    res.json({
      keywords,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single keyword
exports.getKeyword = async (req, res) => {
  try {
    const keyword = await Keyword.findById(req.params.id);
    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    res.json(keyword);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(400).json({ error: 'Keyword already exists' });
    }

    const keyword = await Keyword.findByIdAndUpdate(
      req.params.id,
      { name: name.toLowerCase() },
      { new: true }
    );
    
    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    res.json(keyword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete keyword
exports.deleteKeyword = async (req, res) => {
  try {
    const keyword = await Keyword.findByIdAndDelete(req.params.id);
    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    res.json({ message: 'Keyword deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
