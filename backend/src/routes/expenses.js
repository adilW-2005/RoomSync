const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { listExpenses, createExpense, getBalances, getHistoryPaginated, settleUp, exportBalancesCsv } = require('../services/expenseService');

const router = Router();

const imageBase64Schema = Joi.alternatives().try(
  Joi.string().base64({ paddingRequired: false }),
  Joi.string().pattern(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/)
);

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
    const shareAmount = Joi.object({ userId: Joi.string().required(), amount: Joi.number().min(0).required() });
    const sharePercent = Joi.object({ userId: Joi.string().required(), percent: Joi.number().min(0).max(100).required() });
    const shareShares = Joi.object({ userId: Joi.string().required(), shares: Joi.number().min(0).required() });
    const schema = Joi.object({
      groupId: Joi.string().optional(),
      payerId: Joi.string().optional(),
      amount: Joi.number().positive().required(),
      split: Joi.string().valid('equal', 'custom', 'unequal', 'percent', 'shares').required(),
      shares: Joi.alternatives().conditional('split', [
        { is: Joi.valid('custom', 'unequal'), then: Joi.array().items(shareAmount).required() },
        { is: 'percent', then: Joi.array().items(sharePercent).required() },
        { is: 'shares', then: Joi.array().items(shareShares).required() },
        { is: 'equal', then: Joi.forbidden() },
      ]),
      notes: Joi.string().allow('').optional(),
      receiptBase64: imageBase64Schema.optional(),
      recurring: Joi.object({
        enabled: Joi.boolean().required(),
        frequency: Joi.string().valid('weekly', 'monthly', 'custom').required(),
        dayOfMonth: Joi.number().min(1).max(28).optional(),
        intervalWeeks: Joi.number().min(1).max(12).optional(),
      }).optional(),
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

router.get('/settle/deeplink', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ provider: Joi.string().valid('venmo', 'paypal', 'cashapp').required(), to: Joi.string().required(), amount: Joi.number().positive().required(), note: Joi.string().allow('').default('RoomSync settle-up') });
    const { error, value } = schema.validate(req.query || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const { provider, to, amount, note } = value;
    let url = '';
    if (provider === 'venmo') url = `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}`;
    if (provider === 'paypal') url = `https://www.paypal.me/${encodeURIComponent(to)}/${encodeURIComponent(amount)}?note=${encodeURIComponent(note)}`;
    if (provider === 'cashapp') url = `cashapp://payment?recipient=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}`;
    return res.success({ url });
  } catch (e) { next(e); }
});

module.exports = router; 