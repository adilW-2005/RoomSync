const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { getAverageByPlace, listByPlace, createRating } = require('../services/ratingService');

const router = Router();

router.get('/avg', async (req, res, next) => {
  try {
    const schema = Joi.object({ placeId: Joi.string().required() });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await getAverageByPlace(value.placeId);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.get('/by-place', async (req, res, next) => {
  try {
    const schema = Joi.object({ placeId: Joi.string().required() });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await listByPlace(value.placeId);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      kind: Joi.string().valid('apartment', 'dorm').required(),
      placeId: Joi.string().required(),
      placeName: Joi.string().required(),
      stars: Joi.number().min(1).max(5).required(),
      pros: Joi.array().items(Joi.string()).default([]),
      cons: Joi.array().items(Joi.string()).default([]),
      tips: Joi.string().allow('').default(''),
      photos: Joi.array().items(Joi.string()).default([]),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await createRating(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 