const { Router } = require('express');
const Joi = require('joi');
const { registerUser, loginUser } = require('../services/authService');

const router = Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).required(),
  avatarBase64: Joi.string().base64({ paddingRequired: false }).optional(),
  username: Joi.string().trim().lowercase().min(3).max(20).regex(/^[a-z0-9_.]+$/).optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await registerUser(value);
    return res.success(result, 'Registered');
  } catch (e) {
    next(e);
  }
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await loginUser(value);
    return res.success(result, 'Logged in');
  } catch (e) {
    next(e);
  }
});

module.exports = router; 