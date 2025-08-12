const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listChores, createChore, updateChore, completeChore } = require('../services/choreService');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ status: Joi.string().valid('open', 'done').optional(), groupId: Joi.string().optional() });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await listChores(req.user, value);
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
      assignees: Joi.array().items(Joi.string()).default([]),
      repeat: Joi.string().valid('none', 'daily', 'weekly', 'custom').default('none'),
      customDays: Joi.array().items(Joi.number().min(0).max(6)).default([]),
      dueAt: Joi.date().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await createChore(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      title: Joi.string().min(1).optional(),
      assignees: Joi.array().items(Joi.string()).optional(),
      repeat: Joi.string().valid('none', 'daily', 'weekly', 'custom').optional(),
      customDays: Joi.array().items(Joi.number().min(0).max(6)).optional(),
      dueAt: Joi.date().optional(),
      status: Joi.string().valid('open', 'done').optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await updateChore(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/:id/complete', authRequired, async (req, res, next) => {
  try {
    const result = await completeChore(req.user, req.params.id);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 