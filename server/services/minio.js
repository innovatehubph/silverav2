/**
 * MinIO S3 Service for Silvera V2
 * Handles product image uploads and management
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

class MinIOService {
  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'silvera';
    // Use internal endpoint for uploads, public URL for generated links
    this.endpoint = process.env.MINIO_INTERNAL_ENDPOINT || 'http://innobase-minio-vu1n6w-minio-1:9000';
    this.publicUrl = process.env.MINIO_PUBLIC_URL || 'https://s3.innoserver.cloud';
    
    if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
      console.warn('⚠️  MINIO_ACCESS_KEY or MINIO_SECRET_KEY not set — image uploads will fail');
    }

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1', // MinIO doesn't care about region
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || '',
        secretAccessKey: process.env.MINIO_SECRET_KEY || '',
      },
      forcePathStyle: true, // Required for MinIO
    });

    console.log(`✅ MinIO service initialized: ${this.endpoint}/${this.bucket}`);
  }

  /**
   * Generate unique filename for upload
   */
  generateFilename(originalName, prefix = 'products') {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${prefix}/${timestamp}-${random}${ext}`;
  }

  /**
   * Upload image to MinIO
   * @param {Buffer} fileBuffer - Image buffer
   * @param {string} originalName - Original filename
   * @param {string} contentType - MIME type
   * @param {string} prefix - Folder prefix (products, categories, etc)
   */
  async uploadImage(fileBuffer, originalName, contentType, prefix = 'products') {
    try {
      const key = this.generateFilename(originalName, prefix);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000', // 1 year cache
      });

      await this.client.send(command);
      
      const url = `${this.publicUrl}/${this.bucket}/${key}`;
      console.log(`✅ Image uploaded: ${url}`);
      
      return {
        success: true,
        url: url,
        key: key,
        bucket: this.bucket,
      };
    } catch (error) {
      console.error('MinIO upload error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(files, prefix = 'products') {
    const results = [];
    for (const file of files) {
      const result = await this.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        prefix
      );
      results.push(result);
    }
    return results;
  }

  /**
   * Delete image from MinIO
   */
  async deleteImage(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      console.log(`✅ Image deleted: ${key}`);
      
      return { success: true };
    } catch (error) {
      console.error('MinIO delete error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get signed URL for private access
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return { success: true, url };
    } catch (error) {
      console.error('MinIO signed URL error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get public URL for an image
   */
  getPublicUrl(key) {
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  /**
   * Extract key from full URL
   */
  extractKeyFromUrl(url) {
    const prefix = `${this.publicUrl}/${this.bucket}/`;
    if (url.startsWith(prefix)) {
      return url.replace(prefix, '');
    }
    return null;
  }
}

// Singleton instance
const minioService = new MinIOService();

module.exports = minioService;
