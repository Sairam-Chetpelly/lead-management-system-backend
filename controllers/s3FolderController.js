const Folder = require('../models/Folder');
const Document = require('../models/Document');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const s3FolderService = require('../services/s3FolderService');
const s3Service = require('../services/s3Service');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

// Create folder with S3 support (S3 only)
exports.createFolder = async (req, res) => {
  try {
    const { name, parentFolderId, restricted } = req.body;
    
    console.log('=== S3 FOLDER CREATE START ===');
    console.log('1. Request data:', { name, parentFolderId, restricted });

    if (!name || !name.trim()) {
      return errorResponse(res, 'Folder name is required', 400);
    }

    // Check if AWS S3 is configured
    if (!process.env.AWS_S3_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID) {
      return errorResponse(res, 'S3 is not configured. Please configure AWS credentials.', 500);
    }

    // Generate S3 path
    let parentS3Path = '';
    
    // Get parent folder's S3 path if exists
    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);
      if (parentFolder && parentFolder.s3Path) {
        parentS3Path = parentFolder.s3Path;
      } else if (parentFolder) {
        return errorResponse(res, 'Parent folder must be an S3 folder', 400);
      }
    }
    
    const s3Path = s3FolderService.generateS3FolderPath(name.trim(), req.user.userId, parentS3Path);
    console.log('2. Generated S3 path:', s3Path);

    try {
      // Create folder in S3
      const s3Result = await s3FolderService.createFolder(s3Path);
      console.log('3. S3 folder created:', s3Result);
    } catch (error) {
      console.error('3. S3 folder creation failed:', error.message);
      return errorResponse(res, `Failed to create folder in S3: ${error.message}`, 500);
    }

    // Create folder in database (S3 only)
    const folder = new Folder({
      name: name.trim(),
      parentFolderId,
      restricted: restricted || false,
      createdBy: req.user.userId,
      s3Path,
      storageType: 's3'
    });

    await folder.save();
    await folder.populate('createdBy', 'name email');
    
    console.log('4. Database folder created:', folder._id);
    console.log('=== S3 FOLDER CREATE END ===');
    
    return successResponse(res, folder, 'S3 folder created successfully', 201);
  } catch (error) {
    console.error('Folder creation error:', error);
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

// Delete folder with S3 support
exports.deleteFolder = async (req, res) => {
  try {
    console.log('=== S3 FOLDER DELETE START ===');
    console.log('1. Deleting folder ID:', req.params.id);
    
    const folder = await Folder.findById(req.params.id);
    if (!folder) {
      return errorResponse(res, 'Folder not found', 404);
    }

    console.log('2. Found folder:', { name: folder.name, s3Path: folder.s3Path });

    // Get all subfolders recursively
    const getAllSubfolders = async (folderId) => {
      const subfolders = await Folder.find({ parentFolderId: folderId, deletedAt: null });
      let allSubfolders = [...subfolders];
      
      for (const subfolder of subfolders) {
        const nestedSubfolders = await getAllSubfolders(subfolder._id);
        allSubfolders = [...allSubfolders, ...nestedSubfolders];
      }
      
      return allSubfolders;
    };

    const allSubfolders = await getAllSubfolders(folder._id);
    const allFolderIds = [folder._id, ...allSubfolders.map(f => f._id)];
    
    console.log('3. Found subfolders:', allSubfolders.length);

    // Get all documents in these folders
    const allDocuments = await Document.find({ 
      folderId: { $in: allFolderIds }, 
      deletedAt: null 
    });
    
    console.log('4. Found documents:', allDocuments.length);

    // Delete from S3 if folder has S3 path
    if (folder.s3Path) {
      try {
        console.log('5. Deleting from S3:', folder.s3Path);
        const s3Result = await s3FolderService.deleteFolder(folder.s3Path);
        console.log('6. S3 deletion result:', s3Result);
      } catch (error) {
        console.error('6. S3 deletion failed:', error.message);
        // Continue with database deletion even if S3 fails
      }
    }

    // Delete individual S3 documents
    for (const doc of allDocuments) {
      if (doc.storageType === 's3' && doc.s3Key) {
        try {
          await s3Service.deleteFile(doc.s3Key);
          console.log('7. Deleted S3 document:', doc.s3Key);
        } catch (error) {
          console.error('7. Failed to delete S3 document:', doc.s3Key, error.message);
        }
      }
    }

    // Soft delete all subfolders
    await Folder.updateMany(
      { _id: { $in: allFolderIds } },
      { deletedAt: new Date() }
    );

    // Soft delete all documents
    await Document.updateMany(
      { folderId: { $in: allFolderIds } },
      { deletedAt: new Date() }
    );
    
    console.log('8. Database records soft deleted');
    console.log('=== S3 FOLDER DELETE END ===');
    
    return successResponse(res, null, 'Folder and all contents deleted successfully');
  } catch (error) {
    console.error('Folder deletion error:', error);
    return errorResponse(res, error.message, 500);
  }
};

// Multi-download documents with S3 support
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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayDownloads = await DownloadLog.countDocuments({
        userId: req.user.userId,
        downloadDate: { $gte: startOfDay, $lte: endOfDay }
      });

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

    // Add files to archive (handle both local and S3)
    for (const doc of documents) {
      if (doc.storageType === 's3' && doc.s3Key) {
        try {
          // For S3 files, we need to get a signed URL and stream the content
          const signedUrl = await s3Service.getSignedDownloadUrl(doc.s3Key);
          // Note: This is a simplified approach. In production, you might want to stream directly from S3
          archive.append(signedUrl, { name: doc.fileName });
        } catch (error) {
          console.error('Failed to add S3 file to archive:', error);
        }
      } else if (fs.existsSync(doc.filePath)) {
        archive.file(doc.filePath, { name: doc.fileName });
      }
    }

    archive.finalize();
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Download entire folder with S3 support
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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayDownloads = await DownloadLog.countDocuments({
        userId: req.user.userId,
        downloadDate: { $gte: startOfDay, $lte: endOfDay }
      });

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
        archive.append('', { name: folderData.path });
        createdFolders.add(folderData.path);
      }
    }

    // Add documents to their respective folders (handle both local and S3)
    for (const doc of documents) {
      const documentPath = `${doc.folderPath}${doc.fileName}`;
      
      if (doc.storageType === 's3' && doc.s3Key) {
        try {
          // For S3 files, get signed URL (simplified approach)
          const signedUrl = await s3Service.getSignedDownloadUrl(doc.s3Key);
          archive.append(signedUrl, { name: documentPath });
        } catch (error) {
          console.error('Failed to add S3 file to archive:', error);
        }
      } else if (fs.existsSync(doc.filePath)) {
        archive.file(doc.filePath, { name: documentPath });
      }
    }

    archive.finalize();
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};