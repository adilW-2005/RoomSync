const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listExpenses, createExpense, getBalances } = require('../services/expenseService');

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
    const result = await listExpenses(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const share = Joi.object({ userId: Joi.string().required(), amount: Joi.number().min(0).required() });
    const schema = Joi.object({
      groupId: Joi.string().optional(),
      payerId: Joi.string().optional(),
      amount: Joi.number().positive().required(),
      split: Joi.string().valid('equal', 'custom').required(),
      shares: Joi.array().items(share).when('split', { is: 'custom', then: Joi.required() }),
      notes: Joi.string().allow('').optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await createExpense(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.get('/../balances', (_req, _res, next) => next()); // avoid shadowing order

router.get('/balances', authRequired, async (req, res, next) => {
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
    const result = await getBalances(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 