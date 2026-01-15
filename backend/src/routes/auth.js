const { Router } = require('express');
const Joi = require('joi');
const { registerUser, loginUser } = require('../services/authService');

const router = Router();

const imageBase64Schema = Joi.alternatives().try(
  Joi.string().base64({ paddingRequired: false }),
  Joi.string().pattern(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/)
);

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).required(),
  avatarBase64: imageBase64Schema.optional(),
  username: Joi.string().trim().lowercase().min(3).max(20).regex(/^[a-z0-9_.]+$/).optional(),
});

router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      const details = error.details.map((d) => d.message);
      // Make client-side error actionable without requiring a new mobile build.
      const err = new Error(details[0] ? `Invalid input: ${details[0]}` : 'Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = details;

      // Safe log (do NOT log password). Helps diagnose App Store review / production issues.
      // eslint-disable-next-line no-console
      console.warn('[auth/register] validation_error', {
        details,
        email: req.body?.email,
        hasAvatar: Boolean(req.body?.avatarBase64),
        avatarLength: typeof req.body?.avatarBase64 === 'string' ? req.body.avatarBase64.length : 0,
        username: req.body?.username,
        ua: req.get('user-agent'),
      });
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
      const details = error.details.map((d) => d.message);
      const err = new Error(details[0] ? `Invalid input: ${details[0]}` : 'Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = details;
      throw err;
    }
    const result = await loginUser(value);
    return res.success(result, 'Logged in');
  } catch (e) {
    next(e);
  }
});

module.exports = router; 