const Document = require('./models/Document');
const { uploadProcessedFileToS3, generateDocumentS3Path } = require('./utils/s3DocumentService');
const fs = require('fs');
const path = require('path');

const migrateDocumentsToS3 = async () => {
  try {
    console.log('Starting document migration to S3...');
    
    const documents = await Document.find({ deletedAt: null }).populate('folderId');
    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    console.log(`Found ${documents.length} documents to migrate`);
    
    for (const document of documents) {
      try {
        // Skip if already migrated (S3 key format)
        if (!document.filePath.includes('/') && !document.filePath.includes('\\')) {
          console.log(`⏭️  Skipping ${document.fileName} - already migrated`);
          skippedCount++;
          continue;
        }
        
        // Check if local file exists
        if (!fs.existsSync(document.filePath)) {
          console.log(`❌ Local file not found: ${document.filePath}`);
          errorCount++;
          continue;
        }
        
        console.log(`📤 Migrating: ${document.fileName}`);
        
        // Generate S3 folder path
        const s3FolderPath = await generateDocumentS3Path(document.folderId?._id);
        
        // Upload to S3
        const s3Result = await uploadProcessedFileToS3(
          document.filePath,
          document.fileName,
          document.fileType,
          s3FolderPath
        );
        
        // Update document record with S3 key
        document.filePath = s3Result.s3Key;
        await document.save();
        
        console.log(`✅ Migrated: ${document.fileName} -> ${s3Result.s3Key}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${document.fileName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} documents`);
    console.log(`⏭️  Already migrated: ${skippedCount} documents`);
    console.log(`❌ Errors: ${errorCount} documents`);
    console.log(`📁 Total processed: ${documents.length} documents`);
    
    return { migratedCount, skippedCount, errorCount, total: documents.length };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateDocumentsToS3();
    })
    .then((result) => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDocumentsToS3 };