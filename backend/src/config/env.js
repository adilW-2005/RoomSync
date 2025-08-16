const dotenv = require('dotenv');

let cachedEnv = null;

function loadEnv() {
  if (cachedEnv) return cachedEnv;
  dotenv.config();
  const { NODE_ENV } = process.env;
  let { MONGO_URI, JWT_SECRET, PORT, CLOUDINARY_URL, APP_SCHEME, DEEP_LINK_HOST, PUSH_ENABLED } = process.env;

  // Provide safe defaults for local dev/test
  if (!MONGO_URI) MONGO_URI = 'mongodb://localhost:27017/roomsync';
  if (!JWT_SECRET) JWT_SECRET = NODE_ENV === 'production' ? undefined : 'devsecret';
  if (!APP_SCHEME) APP_SCHEME = 'roomsyncut';
  if (!DEEP_LINK_HOST) DEEP_LINK_HOST = 'roomsync.local';
  if (!PUSH_ENABLED) PUSH_ENABLED = NODE_ENV === 'production' ? 'false' : 'false';

  if (!MONGO_URI || !JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('Missing required envs. Ensure MONGO_URI and JWT_SECRET are set.');
  }

  cachedEnv = { MONGO_URI, JWT_SECRET, PORT, CLOUDINARY_URL, NODE_ENV, APP_SCHEME, DEEP_LINK_HOST, PUSH_ENABLED };
  return cachedEnv;
}

module.exports = { loadEnv }; 