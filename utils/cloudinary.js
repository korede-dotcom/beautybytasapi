const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

class CloudinaryService {
  constructor() {
    cloudinary.config({ 
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
      api_key: process.env.CLOUDINARY_API_KEY, 
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async uploadImage(path, options = {}) {
    const exists = await this.fileExists(path);
    if (!exists) {
      throw new Error(`File not found: ${path}`);
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(path, options, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  uploadMultipleImages(paths, options = {}) {
    return Promise.all(paths.map(path => this.uploadImage(path, options)));
  }

  deleteImage(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }
}

module.exports = new CloudinaryService();
