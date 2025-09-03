const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { getGroupPresence, updatePresence, setHomeGeofence } = require('../presence');
const { resolveAndCache } = require('../services/placeResolverService');

const router = Router();

const beaconSchema = Joi.object({
  groupId: Joi.string().required(),
  lat: Joi.number().required(),
  lng: Joi.number().required(),
  battery: Joi.number().min(0).max(100).optional(),
  shareMinutes: Joi.number().integer().min(1).max(24 * 60).optional(),
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
    const shareUntil = value.shareMinutes ? new Date(Date.now() + value.shareMinutes * 60 * 1000) : undefined;
    // Update presence registry
    updatePresence(value.groupId, req.user._id, value.lat, value.lng, new Date(), value.battery, shareUntil);

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
        shareUntil: shareUntil ? shareUntil.toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      });
    }
    return res.success({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post('/share/stop', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    updatePresence(value.groupId, req.user._id, 0, 0, new Date(), undefined, new Date(Date.now() - 1000));
    return res.success({ ok: true });
  } catch (e) { next(e); }
});

router.post('/home', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().required(), lat: Joi.number().required(), lng: Joi.number().required(), radiusMeters: Joi.number().min(10).max(1000).default(50) });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const home = setHomeGeofence(value.groupId, value);
    return res.success(home);
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

// Resolve UT building codes to coordinates via Google Places, with caching
router.post('/resolve/buildings', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.array().items(Joi.object({ code: Joi.string().required(), name: Joi.string().required() })).required();
    const { error, value } = schema.validate(req.body);
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map(d => d.message); throw err; }
    const results = await Promise.all(value.map(async (b) => {
      const rec = await resolveAndCache({ sourceType: 'building', key: b.code.toUpperCase(), name: b.name });
      return {
        code: b.code,
        name: b.name,
        placeId: rec.placeId || null,
        formatted_address: rec.formattedAddress || null,
        lat: rec.lat ?? null,
        lng: rec.lng ?? null,
      };
    }));
    return res.success({ items: results });
  } catch (e) { next(e); }
});

// Resolve generic UT places (e.g., apartments) by name/id via Google Places, with caching
router.post('/resolve/places', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.array().items(Joi.object({ id: Joi.string().required(), name: Joi.string().required() })).required();
    const { error, value } = schema.validate(req.body);
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map(d => d.message); throw err; }
    const results = await Promise.all(value.map(async (p) => {
      const rec = await resolveAndCache({ sourceType: 'place', key: p.id, name: p.name });
      return {
        id: p.id,
        name: p.name,
        placeId: rec.placeId || null,
        formatted_address: rec.formattedAddress || null,
        lat: rec.lat ?? null,
        lng: rec.lng ?? null,
      };
    }));
    return res.success({ items: results });
  } catch (e) { next(e); }
});

module.exports = router; 