const AWS = require('aws-sdk');
require('dotenv').config();

// Test S3 connection and bucket access
async function testS3Connection() {
  try {
    console.log('Testing S3 connection...');
    
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    
    // Test bucket access
    const bucketExists = await s3.headBucket({ Bucket: bucketName }).promise();
    console.log('✅ S3 bucket access successful');
    
    // List objects (first 5)
    const objects = await s3.listObjectsV2({ 
      Bucket: bucketName, 
      MaxKeys: 5 
    }).promise();
    
    console.log(`✅ Bucket contains ${objects.KeyCount} objects (showing first 5):`);
    objects.Contents?.forEach(obj => {
      console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
    });
    
    // Test upload permissions with a small test file
    const testKey = 'test/connection-test.txt';
    const testContent = 'S3 connection test - ' + new Date().toISOString();
    
    await s3.upload({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    }).promise();
    
    console.log('✅ Test file uploaded successfully');
    
    // Clean up test file
    await s3.deleteObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();
    
    console.log('✅ Test file cleaned up');
    console.log('🎉 S3 service is ready for file uploads!');
    
  } catch (error) {
    console.error('❌ S3 connection test failed:', error.message);
    
    if (error.code === 'CredentialsError') {
      console.error('💡 Check your AWS credentials in .env file');
    } else if (error.code === 'NoSuchBucket') {
      console.error('💡 Check your S3 bucket name in .env file');
    } else if (error.code === 'AccessDenied') {
      console.error('💡 Check your AWS IAM permissions for S3 access');
    }
  }
}

// Run the test
if (require.main === module) {
  testS3Connection();
}

module.exports = { testS3Connection };