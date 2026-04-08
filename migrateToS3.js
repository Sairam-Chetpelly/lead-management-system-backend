const mongoose = require('mongoose');
const Document = require('./models/Document');
const s3Service = require('./services/s3Service');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateDocumentsToS3() {
  try {
    console.log('Starting S3 migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all documents that are stored locally
    const localDocuments = await Document.find({
      $or: [
        { storageType: 'local' },
        { storageType: { $exists: false } }
      ],
      deletedAt: null
    });

    console.log(`Found ${localDocuments.length} local documents to migrate`);

    let migrated = 0;
    let failed = 0;

    for (const doc of localDocuments) {
      try {
        console.log(`Migrating document: ${doc.fileName} (${doc._id})`);
        
        // Check if local file exists
        if (!fs.existsSync(doc.filePath)) {
          console.log(`⚠️  Local file not found: ${doc.filePath}`);
          failed++;
          continue;
        }

        // Generate S3 key
        const s3Key = s3Service.generateS3Key(doc.fileName, doc.uploadedBy.toString());
        
        // Upload to S3
        const s3Result = await s3Service.uploadFile(doc.filePath, s3Key, doc.fileType);
        
        // Update document record
        doc.s3Key = s3Key;
        doc.s3Url = s3Result.url;
        doc.storageType = 's3';
        
        await doc.save();
        
        // Optionally delete local file after successful S3 upload
        // Uncomment the next lines if you want to delete local files
        // fs.unlinkSync(doc.filePath);
        // console.log(`✅ Migrated and cleaned up: ${doc.fileName}`);
        
        console.log(`✅ Migrated: ${doc.fileName}`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${doc.fileName}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total processed: ${localDocuments.length}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateDocumentsToS3();
}

module.exports = { migrateDocumentsToS3 };