const express = require('express');
const router = express.Router();
const {
  getUploadUrl,
  getPostUrl,
  getDownloadUrl,
  verifyFileUpload,
  deleteFileHandler,
  getFileTypeInfoHandler,
  processUploadedFile,
  batchGenerateUploadUrls
} = require('../controllers/presignedUrlController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     UploadUrlRequest:
 *       type: object
 *       required:
 *         - fileName
 *         - fileType
 *         - fileSize
 *       properties:
 *         fileName:
 *           type: string
 *           description: Original filename
 *         fileType:
 *           type: string
 *           description: MIME type of the file
 *         fileSize:
 *           type: number
 *           description: File size in bytes
 *         folder:
 *           type: string
 *           default: documents
 *           description: S3 folder name
 *     
 *     UploadUrlResponse:
 *       type: object
 *       properties:
 *         uploadUrl:
 *           type: string
 *           description: Pre-signed URL for upload
 *         key:
 *           type: string
 *           description: S3 object key
 *         expiresIn:
 *           type: number
 *           description: URL expiration time in seconds
 *         maxSize:
 *           type: number
 *           description: Maximum allowed file size
 *         category:
 *           type: string
 *           description: File category (images, documents, etc.)
 */

/**
 * @swagger
 * /api/presigned/upload-url:
 *   post:
 *     summary: Generate pre-signed URL for direct S3 upload
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UploadUrlRequest'
 *           example:
 *             fileName: "document.pdf"
 *             fileType: "application/pdf"
 *             fileSize: 1024000
 *             folder: "documents"
 *     responses:
 *       200:
 *         description: Upload URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/UploadUrlResponse'
 */
router.post('/upload-url', authenticateToken, getUploadUrl);

/**
 * @swagger
 * /api/presigned/post-url:
 *   post:
 *     summary: Generate pre-signed POST URL (more secure)
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UploadUrlRequest'
 *     responses:
 *       200:
 *         description: POST URL generated successfully
 */
router.post('/post-url', authenticateToken, getPostUrl);

/**
 * @swagger
 * /api/presigned/batch-upload-urls:
 *   post:
 *     summary: Generate multiple pre-signed URLs for batch upload
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   $ref: '#/components/schemas/UploadUrlRequest'
 *               folder:
 *                 type: string
 *                 default: documents
 *           example:
 *             files:
 *               - fileName: "doc1.pdf"
 *                 fileType: "application/pdf"
 *                 fileSize: 1024000
 *               - fileName: "image1.jpg"
 *                 fileType: "image/jpeg"
 *                 fileSize: 512000
 *             folder: "documents"
 *     responses:
 *       200:
 *         description: Batch upload URLs generated
 */
router.post('/batch-upload-urls', authenticateToken, batchGenerateUploadUrls);

/**
 * @swagger
 * /api/presigned/download-url/{key}:
 *   get:
 *     summary: Generate pre-signed URL for file download
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 object key
 *       - in: query
 *         name: expires
 *         schema:
 *           type: number
 *           default: 3600
 *         description: URL expiration time in seconds
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 */
router.get('/download-url/:key(*)', authenticateToken, getDownloadUrl);

/**
 * @swagger
 * /api/presigned/verify/{key}:
 *   get:
 *     summary: Verify file upload completion
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 object key
 *     responses:
 *       200:
 *         description: File upload verified
 *       404:
 *         description: File not found or upload incomplete
 */
router.get('/verify/:key(*)', authenticateToken, verifyFileUpload);

/**
 * @swagger
 * /api/presigned/delete/{key}:
 *   delete:
 *     summary: Delete file from S3
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 object key
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 */
router.delete('/delete/:key(*)', authenticateToken, deleteFileHandler);

/**
 * @swagger
 * /api/presigned/file-types:
 *   get:
 *     summary: Get allowed file types and size limits
 *     tags: [Pre-signed URLs]
 *     parameters:
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *         description: Check specific MIME type
 *     responses:
 *       200:
 *         description: File type information retrieved
 */
router.get('/file-types', getFileTypeInfoHandler);

/**
 * @swagger
 * /api/presigned/process:
 *   post:
 *     summary: Process uploaded file (apply watermark, etc.)
 *     tags: [Pre-signed URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: S3 object key
 *               applyWatermark:
 *                 type: boolean
 *                 default: false
 *                 description: Apply watermark to images/PDFs
 *     responses:
 *       200:
 *         description: File processed successfully
 */
router.post('/process', authenticateToken, processUploadedFile);

module.exports = router;