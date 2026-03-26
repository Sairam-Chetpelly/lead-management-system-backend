const Folder = require('../models/Folder');
const Document = require('../models/Document');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

// Create folder
exports.createFolder = async (req, res) => {
  try {
    const { name, parentFolderId, restricted } = req.body;
    
    const folder = new Folder({
      name,
      parentFolderId,
      restricted: restricted || false,
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
    const { name, restricted } = req.body;
    const updateData = { name };
    
    // Only allow restricted field update if provided
    if (typeof restricted === 'boolean') {
      updateData.restricted = restricted;
    }
    
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updateData,
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

// Multi-download documents
exports.multiDownload = async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return errorResponse(res, 'Document IDs are required', 400);
    }

    // Check user role and download limit
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    // Admin has unlimited downloads, others have 50 limit
    if (userRole !== 'admin') {
      // Get today's start and end timestamps
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Count today's downloads for this user
      const todayDownloads = await DownloadLog.countDocuments({
        userId: req.user.userId,
        downloadDate: { $gte: startOfDay, $lte: endOfDay }
      });

      // Check if limit exceeded (considering bulk download as multiple downloads)
      if (todayDownloads + documentIds.length > 50) {
        return errorResponse(res, `Daily download limit exceeded. You can download ${50 - todayDownloads} more documents today. Limit resets at midnight.`, 400);
      }
    }

    // Get documents
    const documents = await Document.find({ 
      _id: { $in: documentIds }, 
      deletedAt: null 
    });

    if (documents.length === 0) {
      return errorResponse(res, 'No valid documents found', 404);
    }

    // Log downloads for non-admin users only
    if (userRole !== 'admin') {
      const downloadLogs = documents.map(doc => ({
        userId: req.user.userId,
        documentId: doc._id,
        downloadDate: new Date()
      }));
      await DownloadLog.insertMany(downloadLogs);
    }

    // Create zip file
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipName = `documents_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    archive.pipe(res);

    // Add files to archive
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        archive.file(doc.filePath, { name: doc.fileName });
      }
    }

    archive.finalize();
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Download entire folder
exports.downloadFolder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get folder info
    const folder = await Folder.findOne({ _id: id, deletedAt: null });
    if (!folder) {
      return errorResponse(res, 'Folder not found', 404);
    }

    // Check if folder is restricted
    if (folder.restricted) {
      return errorResponse(res, 'This folder is restricted and cannot be downloaded', 403);
    }

    // Get all folders and documents recursively with proper hierarchy
    const getAllFolderData = async (currentFolderId, currentPath = '') => {
      const currentFolder = await Folder.findOne({ _id: currentFolderId, deletedAt: null });
      if (!currentFolder) return { folders: [], documents: [] };

      const folderPath = currentPath ? `${currentPath}${currentFolder.name}/` : `${currentFolder.name}/`;
      
      // Get documents in current folder
      const documents = await Document.find({ 
        folderId: currentFolderId, 
        deletedAt: null 
      });
      
      // Get subfolders
      const subfolders = await Folder.find({ 
        parentFolderId: currentFolderId, 
        deletedAt: null 
      });
      
      let allFolders = [{ folder: currentFolder, path: folderPath }];
      let allDocuments = documents.map(doc => ({ ...doc.toObject(), folderPath }));
      
      // Recursively get data from subfolders
      for (const subfolder of subfolders) {
        const subData = await getAllFolderData(subfolder._id, folderPath);
        allFolders = [...allFolders, ...subData.folders];
        allDocuments = [...allDocuments, ...subData.documents];
      }
      
      return { folders: allFolders, documents: allDocuments };
    };

    const { folders, documents } = await getAllFolderData(id);
    
    if (documents.length === 0) {
      return errorResponse(res, 'No documents found in this folder', 404);
    }

    // Check user role and download limit
    const user = await User.findById(req.user.userId).populate('roleId');
    const userRole = user?.roleId?.slug;

    // Admin has unlimited downloads, others have 50 limit
    if (userRole !== 'admin') {
      // Get today's start and end timestamps
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Count today's downloads for this user
      const todayDownloads = await DownloadLog.countDocuments({
        userId: req.user.userId,
        downloadDate: { $gte: startOfDay, $lte: endOfDay }
      });

      // Check if limit exceeded
      if (todayDownloads + documents.length > 50) {
        return errorResponse(res, `Daily download limit exceeded. This folder contains ${documents.length} documents. You can download ${50 - todayDownloads} more documents today. Limit resets at midnight.`, 400);
      }
    }

    // Log downloads for non-admin users only
    if (userRole !== 'admin') {
      const downloadLogs = documents.map(doc => ({
        userId: req.user.userId,
        documentId: doc._id,
        downloadDate: new Date()
      }));
      await DownloadLog.insertMany(downloadLogs);
    }

    // Create zip file
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipName = `${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    archive.pipe(res);

    // Create empty folders first to ensure folder structure
    const createdFolders = new Set();
    for (const folderData of folders) {
      if (!createdFolders.has(folderData.path)) {
        // Create empty folder in ZIP
        archive.append('', { name: folderData.path });
        createdFolders.add(folderData.path);
      }
    }

    // Add documents to their respective folders
    for (const doc of documents) {
      if (fs.existsSync(doc.filePath)) {
        const documentPath = `${doc.folderPath}${doc.fileName}`;
        archive.file(doc.filePath, { name: documentPath });
      }
    }

    archive.finalize();
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
