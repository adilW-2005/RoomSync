const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { getGroupPresence, updatePresence } = require('../presence');

const router = Router();

const beaconSchema = Joi.object({
  groupId: Joi.string().required(),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  battery: Joi.number().min(0).max(100).optional(),
});

router.post('/beacon', authRequired, async (req, res, next) => {
  try {
    const { error, value } = beaconSchema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    // Update presence registry
    updatePresence(value.groupId, req.user._id, value.lat, value.lng, new Date(), value.battery);

    // Broadcast over socket for same group (optional)
    const { tryGetIO } = require('../socket');
    const io = tryGetIO();
    if (io) {
      io.to(String(value.groupId)).emit('location:update', {
        userId: String(req.user._id),
        groupId: String(value.groupId),
        lat: value.lat,
        lng: value.lng,
        battery: value.battery,
        updatedAt: new Date().toISOString(),
      });
    }
    return res.success({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/presence', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().required() });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const presence = getGroupPresence(value.groupId);
    return res.success(presence);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 