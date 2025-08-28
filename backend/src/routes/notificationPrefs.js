const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const UserNotificationPrefs = require('../models/UserNotificationPrefs');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const prefs = await UserNotificationPrefs.findOne({ userId: req.user._id });
    return res.success(prefs ? prefs.toJSON() : { userId: String(req.user._id), categories: { chores: true, events: true, expenses: true, chat: true, marketplace: true, system: true }, channels: { push: true, inapp: true, email: false, sms: false }, quietHours: { start: null, end: null, tz: 'UTC' }, digest: 'off' });
  } catch (e) { next(e); }
});

router.put('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      categories: Joi.object().pattern(/.*/, Joi.boolean()).optional(),
      channels: Joi.object({ push: Joi.boolean(), inapp: Joi.boolean(), email: Joi.boolean(), sms: Joi.boolean() }).optional(),
      quietHours: Joi.object({ start: Joi.string().allow(null), end: Joi.string().allow(null), tz: Joi.string().allow(null) }).optional(),
      digest: Joi.string().valid('daily', 'weekly', 'off').optional(),
    });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const prefs = await UserNotificationPrefs.findOneAndUpdate({ userId: req.user._id }, { $set: { ...value, updatedAt: new Date() } }, { upsert: true, new: true });
    return res.success(prefs.toJSON());
  } catch (e) { next(e); }
});

module.exports = router; 