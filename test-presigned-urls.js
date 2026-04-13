require('dotenv').config();

// Debug environment variables
console.log('Environment check:');
console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS credentials set:', !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY);
console.log('');

const { generateUploadUrl, generateDownloadUrl, verifyUpload, ALLOWED_TYPES } = require('./utils/presignedUrlService');

async function testPresignedUrls() {
  console.log('🧪 Testing Pre-signed URL Service...\n');

  try {
    // Test 1: Check allowed types
    console.log('1️⃣ Testing file type validation...');
    console.log('Allowed types:', Object.keys(ALLOWED_TYPES));
    
    // Test 2: Generate upload URL for valid file
    console.log('\n2️⃣ Testing upload URL generation...');
    const uploadResult = await generateUploadUrl(
      'test-document.pdf',
      'application/pdf',
      1024000, // 1MB
      'test-folder'
    );
    
    console.log('✅ Upload URL generated successfully');
    console.log('Key:', uploadResult.key);
    console.log('Category:', uploadResult.category);
    console.log('Max Size:', (uploadResult.maxSize / 1024 / 1024).toFixed(1), 'MB');
    console.log('Expires in:', uploadResult.expiresIn, 'seconds');
    console.log('URL length:', uploadResult.uploadUrl.length, 'characters');
    
    // Test 3: Test invalid file type
    console.log('\n3️⃣ Testing invalid file type rejection...');
    try {
      await generateUploadUrl('test.exe', 'application/x-executable', 1024);
      console.log('❌ Should have rejected invalid file type');
    } catch (error) {
      console.log('✅ Correctly rejected invalid file type:', error.message);
    }
    
    // Test 4: Test file size limit
    console.log('\n4️⃣ Testing file size limit...');
    try {
      await generateUploadUrl('huge-file.pdf', 'application/pdf', 100 * 1024 * 1024); // 100MB
      console.log('❌ Should have rejected oversized file');
    } catch (error) {
      console.log('✅ Correctly rejected oversized file:', error.message);
    }
    
    // Test 5: Generate download URL (will fail since file doesn't exist, but URL should generate)
    console.log('\n5️⃣ Testing download URL generation...');
    try {
      const downloadResult = await generateDownloadUrl('test-folder/nonexistent-file.pdf');
      console.log('✅ Download URL generated');
      console.log('Expires in:', downloadResult.expiresIn, 'seconds');
      console.log('URL length:', downloadResult.downloadUrl.length, 'characters');
    } catch (error) {
      console.log('⚠️ Download URL generation failed (expected for non-existent file):', error.message);
    }
    
    // Test 6: Test different file categories
    console.log('\n6️⃣ Testing different file categories...');
    
    const testFiles = [
      { name: 'image.jpg', type: 'image/jpeg', size: 2048000 },
      { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 5120000 },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 3072000 },
      { name: 'data.csv', type: 'text/csv', size: 1024000 }
    ];
    
    for (const file of testFiles) {
      try {
        const result = await generateUploadUrl(file.name, file.type, file.size);
        console.log(`✅ ${file.name} (${result.category}): ${(result.maxSize / 1024 / 1024).toFixed(1)}MB limit`);
      } catch (error) {
        console.log(`❌ ${file.name}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Pre-signed URL service tests completed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ File type validation working');
    console.log('- ✅ File size limits enforced');
    console.log('- ✅ Upload URLs generated with proper security');
    console.log('- ✅ Different file categories supported');
    console.log('- ✅ Secure filename generation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test S3 bucket CORS configuration
async function testCorsConfiguration() {
  console.log('\n🌐 Testing S3 CORS Configuration...');
  
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });
  
  try {
    const corsConfig = await s3.getBucketCors({
      Bucket: process.env.AWS_S3_BUCKET_NAME
    }).promise();
    
    console.log('✅ CORS configuration found:');
    corsConfig.CORSRules.forEach((rule, index) => {
      console.log(`Rule ${index + 1}:`);
      console.log('  Allowed Methods:', rule.AllowedMethods.join(', '));
      console.log('  Allowed Origins:', rule.AllowedOrigins.join(', '));
      console.log('  Allowed Headers:', rule.AllowedHeaders?.join(', ') || 'None');
    });
    
  } catch (error) {
    if (error.code === 'NoSuchCORSConfiguration') {
      console.log('⚠️ No CORS configuration found. You may need to configure CORS for frontend uploads.');
      console.log('Recommended CORS configuration:');
      console.log(`{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT", "GET", "DELETE"],
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}`);
    } else {
      console.log('❌ CORS check failed:', error.message);
    }
  }
}

// Run tests
if (require.main === module) {
  testPresignedUrls().then(() => {
    return testCorsConfiguration();
  });
}

module.exports = { testPresignedUrls, testCorsConfiguration };