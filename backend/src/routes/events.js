const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listEvents, createEvent, updateEvent } = require('../services/eventService');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().optional() });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await listEvents(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      groupId: Joi.string().optional(),
      title: Joi.string().min(1).required(),
      startAt: Joi.date().required(),
      endAt: Joi.date().required(),
      locationText: Joi.string().allow('').default(''),
      attendees: Joi.array().items(Joi.string()).default([]),
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
      repeat: Joi.string().valid('none', 'daily', 'weekly', 'custom').default('none'),
      customDays: Joi.array().items(Joi.number().min(0).max(6)).default([]),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await createEvent(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().min(1).optional(),
      startAt: Joi.date().optional(),
      endAt: Joi.date().optional(),
      locationText: Joi.string().allow('').optional(),
      attendees: Joi.array().items(Joi.string()).optional(),
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
      repeat: Joi.string().valid('none', 'daily', 'weekly', 'custom').optional(),
      customDays: Joi.array().items(Joi.number().min(0).max(6)).optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await updateEvent(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 