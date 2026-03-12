const Folder = require('../models/Folder');
const Document = require('../models/Document');
const { successResponse, errorResponse } = require('../utils/response');

// Create folder
exports.createFolder = async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;
    
    const folder = new Folder({
      name,
      parentFolderId,
      createdBy: req.user.userId
    });

    await folder.save();
    await folder.populate('createdBy', 'name email');
    return successResponse(res, folder, 'Folder created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get folders by parent or root
exports.getFolders = async (req, res) => {
  try {
    const { parentFolderId } = req.query;
    const folders = await Folder.find({ 
      parentFolderId: parentFolderId || null, 
      deletedAt: null 
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return successResponse(res, { folders }, 'Folders retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get all folders (for tree view)
exports.getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ deletedAt: null })
      .populate('createdBy', 'name email')
      .populate('parentFolderId', 'name')
      .sort({ createdAt: -1 });
    return successResponse(res, { folders }, 'All folders retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get folder with contents
exports.getFolderContents = async (req, res) => {
  try {
    const { id } = req.params;
    const folder = await Folder.findOne({ _id: id, deletedAt: null })
      .populate('createdBy', 'name email');
    
    if (!folder) {
      return errorResponse(res, 'Folder not found', 404);
    }

    const subfolders = await Folder.find({ parentFolderId: id, deletedAt: null });
    const documents = await Document.find({ folderId: id, deletedAt: null })
      .populate('uploadedBy', 'name email');

    return successResponse(res, { folder, subfolders, documents }, 'Folder contents retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update folder
exports.updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name },
      { new: true }
    ).populate('createdBy', 'name email');

    if (!folder) {
      return errorResponse(res, 'Folder not found', 404);
    }
    return successResponse(res, folder, 'Folder updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete folder
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return errorResponse(res, 'Folder not found', 404);
    }

    await Folder.updateMany(
      { parentFolderId: folder._id },
      { deletedAt: new Date() }
    );
    await Document.updateMany(
      { folderId: folder._id },
      { deletedAt: new Date() }
    );
    
    folder.deletedAt = new Date();
    await folder.save();
    return successResponse(res, null, 'Folder deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
