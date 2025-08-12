const dotenv = require('dotenv');

let cachedEnv = null;

function loadEnv() {
  if (cachedEnv) return cachedEnv;
  dotenv.config();
  const { NODE_ENV } = process.env;
  let { MONGO_URI, JWT_SECRET, PORT, CLOUDINARY_URL } = process.env;

  // Provide safe defaults for local dev/test
  if (!MONGO_URI) MONGO_URI = 'mongodb://localhost:27017/roomsync';
  if (!JWT_SECRET) JWT_SECRET = NODE_ENV === 'production' ? undefined : 'devsecret';

  if (!MONGO_URI || !JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('Missing required envs. Ensure MONGO_URI and JWT_SECRET are set.');
  }

  cachedEnv = { MONGO_URI, JWT_SECRET, PORT, CLOUDINARY_URL, NODE_ENV };
  return cachedEnv;
}

module.exports = { loadEnv }; 