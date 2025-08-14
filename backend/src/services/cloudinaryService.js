const cloudinary = require('cloudinary').v2;
const { loadEnv } = require('../config/env');

let configured = false;
function ensureConfig() {
  if (configured) return;
  const { CLOUDINARY_URL } = loadEnv();
  if (CLOUDINARY_URL) {
    cloudinary.config({
      secure: true,
      cloudinary_url: CLOUDINARY_URL
    });
  }
  configured = true;
}

async function uploadBase64ToCloudinary(base64, folder = 'uploads') {
  ensureConfig();
  const res = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 512, height: 512, crop: 'limit' }]
  });
  return res.secure_url;
}

module.exports = { uploadBase64ToCloudinary }; 