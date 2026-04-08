const mongoose = require('mongoose');
const Folder = require('./models/Folder');
const s3FolderService = require('./services/s3FolderService');
require('dotenv').config();

async function migrateFoldersToS3() {
  try {
    console.log('Starting S3 folder migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all folders that don't have S3 paths
    const localFolders = await Folder.find({
      $or: [
        { s3Path: null },
        { s3Path: { $exists: false } }
      ],
      deletedAt: null
    }).populate('createdBy');

    console.log(`Found ${localFolders.length} local folders to migrate`);

    let migrated = 0;
    let failed = 0;

    // Build folder hierarchy map
    const folderMap = new Map();
    localFolders.forEach(folder => {
      folderMap.set(folder._id.toString(), folder);
    });

    // Function to get folder hierarchy path
    const getFolderPath = (folder, visited = new Set()) => {
      if (visited.has(folder._id.toString())) {
        console.warn(`Circular reference detected for folder: ${folder.name}`);
        return folder.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      }
      
      visited.add(folder._id.toString());
      
      if (!folder.parentFolderId) {
        return folder.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      }
      
      const parentFolder = folderMap.get(folder.parentFolderId.toString());
      if (!parentFolder) {
        return folder.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      }
      
      const parentPath = getFolderPath(parentFolder, visited);
      return `${parentPath}/${folder.name.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
    };

    // Sort folders by hierarchy (root folders first)
    const sortedFolders = localFolders.sort((a, b) => {
      const aDepth = a.parentFolderId ? 1 : 0;
      const bDepth = b.parentFolderId ? 1 : 0;
      return aDepth - bDepth;
    });

    for (const folder of sortedFolders) {
      try {
        console.log(`Migrating folder: ${folder.name} (${folder._id})`);
        
        // Get the full hierarchy path
        const hierarchyPath = getFolderPath(folder);
        const userId = folder.createdBy._id.toString();
        
        // Generate S3 path
        const s3Path = `folders/${userId}/${hierarchyPath}/`;
        
        console.log(`Generated S3 path: ${s3Path}`);
        
        // Create folder in S3
        const s3Result = await s3FolderService.createFolder(s3Path);
        
        // Update folder record
        folder.s3Path = s3Path;
        folder.storageType = 's3';
        
        await folder.save();
        
        console.log(`✅ Migrated: ${folder.name} -> ${s3Path}`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${folder.name}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Folder Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total processed: ${localFolders.length}`);
    
  } catch (error) {
    console.error('Folder migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFoldersToS3();
}

module.exports = { migrateFoldersToS3 };