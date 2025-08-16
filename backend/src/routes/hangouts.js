const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listHangouts, createHangout, vote, setRsvp, postMessage } = require('../services/hangoutService');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().optional() });
    const { error, value } = schema.validate(req.query || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await listHangouts(req.user, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().optional(), title: Joi.string().min(1).required(), description: Joi.string().allow('').optional(), options: Joi.array().items(Joi.object({ id: Joi.string().required(), label: Joi.string().required(), when: Joi.date().optional() })).default([]) });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await createHangout(req.user, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/:id/vote', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ optionId: Joi.string().required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await vote(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/:id/rsvp', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ status: Joi.string().valid('going', 'maybe', 'not').required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await setRsvp(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/:id/messages', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ text: Joi.string().allow('').optional() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await postMessage(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) { next(e); }
});

module.exports = router; 