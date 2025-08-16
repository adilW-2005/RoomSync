const { Router } = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { authRequired } = require('../middlewares/auth');
const { listListings, createListing, updateListing, toggleFavorite, sendMessage, listMessages } = require('../services/listingService');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const schema = Joi.object({
      type: Joi.string().valid('sublet', 'furniture', 'other').optional(),
      q: Joi.string().optional(),
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional(),
      category: Joi.string().optional(),
      sort: Joi.string().valid('price_asc', 'price_desc', 'date_asc', 'date_desc').optional(),
    });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await listListings(value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

const createLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/', authRequired, createLimiter, async (req, res, next) => {
  try {
    const schema = Joi.object({
      type: Joi.string().valid('sublet', 'furniture', 'other').required(),
      categories: Joi.array().items(Joi.string()).default([]),
      title: Joi.string().min(1).required(),
      description: Joi.string().allow('').optional(),
      price: Joi.number().min(0).required(),
      photos: Joi.array().items(Joi.string()).default([]),
      photosBase64: Joi.array().items(Joi.string().base64({ paddingRequired: false })).optional(),
      loc: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() }).required(),
      availableFrom: Joi.date().optional(),
      availableTo: Joi.date().optional(),
      status: Joi.string().valid('available', 'pending', 'sold').optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await createListing(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      type: Joi.string().valid('sublet', 'furniture', 'other').optional(),
      categories: Joi.array().items(Joi.string()).optional(),
      title: Joi.string().min(1).optional(),
      description: Joi.string().allow('').optional(),
      price: Joi.number().min(0).optional(),
      photos: Joi.array().items(Joi.string()).optional(),
      loc: Joi.object({ lat: Joi.number().required(), lng: Joi.number().required() }).optional(),
      availableFrom: Joi.date().optional(),
      availableTo: Joi.date().optional(),
      status: Joi.string().valid('available', 'pending', 'sold').optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await updateListing(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/favorite', authRequired, async (req, res, next) => {
  try {
    const result = await toggleFavorite(req.user, req.params.id, true);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/:id/unfavorite', authRequired, async (req, res, next) => {
  try {
    const result = await toggleFavorite(req.user, req.params.id, false);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/:id/messages', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ toUserId: Joi.string().required(), text: Joi.string().allow('').optional(), photosBase64: Joi.array().items(Joi.string()).optional() });
    const { error, value } = schema.validate(req.body || {});
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await sendMessage(req.user, { ...value, listingId: req.params.id });
    return res.success(result);
  } catch (e) { next(e); }
});

router.get('/:id/messages', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ withUserId: Joi.string().required() });
    const { error, value } = schema.validate(req.query || {});
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await listMessages(req.user, { withUserId: value.withUserId, listingId: req.params.id });
    return res.success(result);
  } catch (e) { next(e); }
});

module.exports = router; 