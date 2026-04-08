const s3FolderService = require('../services/s3FolderService');
const { successResponse, errorResponse } = require('../utils/response');

// Test S3 connection
exports.testS3Connection = async (req, res) => {
  try {
    console.log('=== S3 CONNECTION TEST ===');
    console.log('1. AWS Config:', {
      region: process.env.AWS_REGION,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });

    // Test creating a simple folder
    const testPath = `test-folders/${req.user.userId}/connection-test-${Date.now()}/`;
    console.log('2. Testing folder creation at:', testPath);

    const result = await s3FolderService.createFolder(testPath);
    console.log('3. S3 folder creation result:', result);

    // Test listing to verify it was created
    const listResult = await s3FolderService.listFolderContents('test-folders/');
    console.log('4. S3 list result:', listResult);

    return successResponse(res, {
      connection: 'success',
      testPath,
      result,
      listResult
    }, 'S3 connection test successful');

  } catch (error) {
    console.error('S3 connection test failed:', error);
    return errorResponse(res, `S3 connection failed: ${error.message}`, 500);
  }
};