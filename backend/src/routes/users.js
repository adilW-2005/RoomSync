const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { updateProfile } = require('../services/userService');

const router = Router();

router.get('/me', authRequired, async (req, res) => {
  const user = req.user.toJSON();
  return res.success(user);
});

router.patch('/me', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).optional(),
      bio: Joi.string().max(500).optional(),
      contact: Joi.string().max(200).optional(),
      avatarBase64: Joi.string().base64({ paddingRequired: false }).optional()
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await updateProfile(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 