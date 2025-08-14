const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listInventory, createInventory, updateInventory, deleteInventory } = require('../services/inventoryService');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().optional(), q: Joi.string().allow('').optional() });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await listInventory(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      groupId: Joi.string().optional(),
      ownerId: Joi.string().optional(),
      name: Joi.string().min(1).required(),
      qty: Joi.number().min(0).required(),
      shared: Joi.boolean().default(false),
      expiresAt: Joi.date().optional(),
      photoBase64: Joi.string().base64({ paddingRequired: false }).optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await createInventory(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      name: Joi.string().min(1).optional(),
      qty: Joi.number().min(0).optional(),
      shared: Joi.boolean().optional(),
      expiresAt: Joi.date().optional(),
      photoBase64: Joi.string().base64({ paddingRequired: false }).optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await updateInventory(req.user, req.params.id, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const result = await deleteInventory(req.user, req.params.id);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 