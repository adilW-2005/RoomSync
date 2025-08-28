const { Router } = require('express');
const Joi = require('joi');
const DeviceToken = require('../models/DeviceToken');
const { authRequired } = require('../middlewares/auth');

const router = Router();

router.post('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ token: Joi.string().required(), platform: Joi.string().valid('ios', 'android', 'web', 'expo').default('expo') });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const existing = await DeviceToken.findOne({ userId: req.user._id, token: value.token });
    if (existing) {
      existing.enabled = true; existing.platform = value.platform; existing.lastSeenAt = new Date(); await existing.save();
      return res.success(existing.toJSON());
    }
    const created = await DeviceToken.create({ userId: req.user._id, token: value.token, platform: value.platform });
    return res.success(created.toJSON());
  } catch (e) { next(e); }
});

module.exports = router; 