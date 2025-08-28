const dotenv = require('dotenv');

let cachedEnv = null;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function loadEnv() {
  if (cachedEnv) return cachedEnv;
  dotenv.config();
  const { NODE_ENV } = process.env;
  let { MONGO_URI, JWT_SECRET, PORT, CLOUDINARY_URL, APP_SCHEME, DEEP_LINK_HOST, PUSH_ENABLED, ALLOWED_ORIGINS, ENFORCE_HTTPS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, TRUST_PROXY } = process.env;
  const { OPENAI_API_KEY, GOOGLE_MAPS_API_KEY } = process.env;

  // Support common alternative env var names used in production
  if (!MONGO_URI) {
    const { MONGODB_URI, MONGO_URL, DATABASE_URL } = process.env;
    MONGO_URI = MONGODB_URI || MONGO_URL || DATABASE_URL || MONGO_URI;
  }

  // Provide safe defaults for local dev/test
  if (!MONGO_URI) MONGO_URI = 'mongodb://localhost:27017/roomsync';
  if (!JWT_SECRET) {
    if (NODE_ENV === 'test') JWT_SECRET = 'test';
    else if (NODE_ENV !== 'production') JWT_SECRET = 'devsecret';
  }
  if (!APP_SCHEME) APP_SCHEME = 'roomsyncut';
  if (!DEEP_LINK_HOST) DEEP_LINK_HOST = 'roomsync.local';
  if (!PUSH_ENABLED) PUSH_ENABLED = NODE_ENV === 'production' ? 'false' : 'false';

  // Production sanity warnings
  if (!MONGO_URI || !JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('Missing required envs. Ensure MONGO_URI and JWT_SECRET are set.');
  }

  cachedEnv = {
    MONGO_URI,
    JWT_SECRET,
    PORT,
    CLOUDINARY_URL,
    NODE_ENV,
    APP_SCHEME,
    DEEP_LINK_HOST,
    PUSH_ENABLED,
    OPENAI_API_KEY,
    GOOGLE_MAPS_API_KEY,
    ALLOWED_ORIGINS,
    ENFORCE_HTTPS,
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX,
    TRUST_PROXY,
    IS_PROD: NODE_ENV === 'production',
    IS_TEST: NODE_ENV === 'test',
    IS_DEV: !NODE_ENV || NODE_ENV === 'development'
  };
  return cachedEnv;
}

module.exports = { loadEnv, parseBoolean }; 