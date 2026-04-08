const Folder = require('../models/Folder');
const { createS3Folder, generateS3FolderPath } = require('./s3Service');

// Sync all existing folders to S3
const syncFoldersToS3 = async () => {
  try {
    console.log('Starting folder sync to S3...');
    
    const folders = await Folder.find({ deletedAt: null }).sort({ createdAt: 1 });
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const folder of folders) {
      try {
        const s3FolderPath = await generateS3FolderPath(folder._id, folder.name, folder.parentFolderId);
        await createS3Folder(s3FolderPath);
        console.log(`✓ Synced: ${s3FolderPath}`);
        syncedCount++;
      } catch (error) {
        console.error(`✗ Failed to sync folder ${folder.name}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nSync completed:`);
    console.log(`- Successfully synced: ${syncedCount} folders`);
    console.log(`- Errors: ${errorCount} folders`);
    
    return { syncedCount, errorCount };
  } catch (error) {
    console.error('Folder sync failed:', error);
    throw error;
  }
};

module.exports = {
  syncFoldersToS3
};