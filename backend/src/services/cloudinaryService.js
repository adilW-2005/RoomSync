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
  const { CLOUDINARY_URL, NODE_ENV } = loadEnv();
  if (!CLOUDINARY_URL || NODE_ENV === 'test') {
    // Return a deterministic placeholder in tests or when not configured
    return `https://res.cloudinary.com/demo/image/upload/v1699999999/${folder}/placeholder.png`;
  }
  ensureConfig();
  // Accept either raw base64 or a full data URL. Cloudinary expects a data URL.
  const payload = typeof base64 === 'string' && base64.trim().startsWith('data:')
    ? base64.trim()
    : `data:image/jpeg;base64,${String(base64 || '').trim()}`;
  const res = await cloudinary.uploader.upload(payload, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 512, height: 512, crop: 'limit' }]
  });
  return res.secure_url;
}

module.exports = { uploadBase64ToCloudinary }; 