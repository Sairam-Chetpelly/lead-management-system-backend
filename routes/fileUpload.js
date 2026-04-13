const express = require('express');
const router = express.Router();
const { upload } = require('../utils/s3Service');
const {
  uploadSingleFile,
  uploadMultipleFilesHandler,
  deleteFile,
  getFileUrl,
  getAllowedTypes
} = require('../controllers/fileUploadController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *           description: S3 object key
 *         location:
 *           type: string
 *           description: S3 object URL
 *         originalName:
 *           type: string
 *           description: Original filename
 *         mimeType:
 *           type: string
 *           description: File MIME type
 *         size:
 *           type: number
 *           description: File size in bytes
 *         watermarked:
 *           type: boolean
 *           description: Whether watermark was applied
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               folder:
 *                 type: string
 *                 default: documents
 *                 description: S3 folder name
 *               watermark:
 *                 type: string
 *                 enum: [true, false]
 *                 default: true
 *                 description: Apply watermark to images/PDFs
 *     responses:
 *       200:
 *         description: File uploaded successfully
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
 *                   $ref: '#/components/schemas/FileUploadResponse'
 */
router.post('/upload', authenticateToken, upload.single('file'), uploadSingleFile);

/**
 * @swagger
 * /api/files/upload-multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload
 *               folder:
 *                 type: string
 *                 default: documents
 *                 description: S3 folder name
 *               watermark:
 *                 type: string
 *                 enum: [true, false]
 *                 default: true
 *                 description: Apply watermark to images/PDFs
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 */
router.post('/upload-multiple', authenticateToken, upload.array('files', 10), uploadMultipleFilesHandler);

/**
 * @swagger
 * /api/files/{key}:
 *   delete:
 *     summary: Delete a file from S3
 *     tags: [Files]
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
 */
router.delete('/:key', authenticateToken, deleteFile);

/**
 * @swagger
 * /api/files/url/{key}:
 *   get:
 *     summary: Get signed URL for file access
 *     tags: [Files]
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
 *         description: Signed URL generated successfully
 */
router.get('/url/:key', authenticateToken, getFileUrl);

/**
 * @swagger
 * /api/files/allowed-types:
 *   get:
 *     summary: Get allowed file types
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Allowed file types retrieved successfully
 */
router.get('/allowed-types', getAllowedTypes);

module.exports = router;