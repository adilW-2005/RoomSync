const { Router } = require('express');
const Joi = require('joi');
const { authRequired, requireAdmin } = require('../middlewares/auth');
const { reportContent, listReports, updateReportStatus, blockUser, listBlocks } = require('../services/moderationService');

const router = Router();

router.post('/report', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ targetType: Joi.string().valid('user', 'listing', 'rating', 'message').required(), targetId: Joi.string().required(), reason: Joi.string().allow('').optional() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await reportContent(req.user, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/block', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ blockedUserId: Joi.string().required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await blockUser(req.user, value.blockedUserId);
    return res.success(result);
  } catch (e) { next(e); }
});

router.get('/blocks', authRequired, async (req, res, next) => {
  try {
    const result = await listBlocks(req.user);
    return res.success(result);
  } catch (e) { next(e); }
});

router.get('/reports', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const schema = Joi.object({ status: Joi.string().valid('open', 'reviewed', 'actioned', 'dismissed').optional() });
    const { error, value } = schema.validate(req.query || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await listReports(req.user, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/reports/:id/status', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const schema = Joi.object({ status: Joi.string().valid('open', 'reviewed', 'actioned', 'dismissed').required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await updateReportStatus(req.user, req.params.id, value.status);
    return res.success(result);
  } catch (e) { next(e); }
});

module.exports = router; 