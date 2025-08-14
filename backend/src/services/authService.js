const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { loadEnv } = require('../config/env');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');

function signToken(user) {
  const env = loadEnv();
  return jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: '7d' });
}

async function registerUser({ email, password, name, avatarBase64 }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    err.code = 'EMAIL_TAKEN';
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  let avatarUrl;
  if (avatarBase64) {
    avatarUrl = await uploadBase64ToCloudinary(avatarBase64, 'avatars');
  }
  const user = await User.create({ email: email.toLowerCase(), passwordHash, name, avatarUrl });
  const token = signToken(user);
  return { access_token: token, user: user.toJSON() };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }
  const token = signToken(user);
  return { access_token: token, user: user.toJSON() };
}

module.exports = { registerUser, loginUser }; 