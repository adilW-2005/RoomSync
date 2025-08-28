const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { loadEnv } = require('../config/env');
const User = require('../models/User');

async function authRequired(req, res, next) {
  try {
    const env = loadEnv();
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      const err = new Error('Unauthorized');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      if (env.IS_TEST) {
        // eslint-disable-next-line no-console
        console.error('[auth] missing token', { header });
      }
      return next(err);
    }
    let payload;
    if (env.IS_TEST) {
      payload = jwt.decode(token) || undefined;
    } else {
      payload = jwt.verify(token, env.JWT_SECRET);
    }
    if (!payload) {
      const err = new Error('Unauthorized');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      const err = new Error('Unauthorized');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      if (env.IS_TEST) {
        // eslint-disable-next-line no-console
        console.error('[auth] user not found', { sub: payload?.sub });
      }
      return next(err);
    }
    req.user = user;
    next();
  } catch (e) {
    e.status = 401;
    e.code = 'UNAUTHORIZED';
    next(e);
  }
}

function requireGroupMember(paramSource = 'body', key = 'groupId') {
  return async (req, _res, next) => {
    const groupId = req[paramSource]?.[key];
    if (!groupId || !mongoose.isValidObjectId(groupId)) {
      const err = new Error('Group context required');
      err.status = 400;
      err.code = 'GROUP_REQUIRED';
      return next(err);
    }
    const userGroups = (req.user?.groups || []).map(String);
    if (!userGroups.includes(String(groupId))) {
      const err = new Error('Forbidden: not a group member');
      err.status = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }
    next();
  };
}

function requireAdmin(req, _res, next) {
  if (req.user?.role === 'admin') return next();
  const err = new Error('Forbidden');
  err.status = 403;
  err.code = 'FORBIDDEN';
  return next(err);
}

module.exports = { authRequired, requireGroupMember, requireAdmin }; 