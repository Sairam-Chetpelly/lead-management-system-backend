const Category = require('../models/Category');
const { successResponse, errorResponse } = require('../utils/response');

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    const existingCategory = await Category.findOne({ name, deletedAt: null });
    if (existingCategory) {
      return errorResponse(res, 'Category already exists', 400);
    }

    const category = new Category({
      name,
      createdBy: req.user.userId
    });

    await category.save();
    return successResponse(res, category, 'Category created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ deletedAt: null })
      .sort({ name: 1 });
    return successResponse(res, { categories }, 'Categories retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name },
      { new: true }
    );

    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }
    return successResponse(res, category, 'Category updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return errorResponse(res, 'Category not found', 404);
    }

    category.deletedAt = new Date();
    await category.save();
    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
