const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listExpenses, createExpense, getBalances, getHistoryPaginated, settleUp, exportBalancesCsv } = require('../services/expenseService');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().optional(), page: Joi.number().min(1).default(1), limit: Joi.number().min(1).max(100).default(20) });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await getHistoryPaginated(req.user, value);
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
      receiptBase64: Joi.string().base64({ paddingRequired: false }).optional(),
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

router.get('/export.csv', authRequired, async (req, res, next) => {
  try {
    const csv = await exportBalancesCsv(req.user, req.query || {});
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="balances.csv"');
    return res.send(csv);
  } catch (e) {
    next(e);
  }
});

router.post('/settle', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ fromUserId: Joi.string().required(), toUserId: Joi.string().required(), amount: Joi.number().positive().required(), groupId: Joi.string().optional() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }
    const result = await settleUp(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 