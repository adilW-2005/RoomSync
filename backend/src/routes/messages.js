const { Router } = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { authRequired } = require('../middlewares/auth');
const { getOrCreateFromListing, getOrCreateDM, listConversations, sendInConversation, listMessages, markRead } = require('../services/messageService');

const router = Router();

const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

router.get('/conversations', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ page: Joi.number().min(1).default(1), limit: Joi.number().min(1).max(100).default(20) });
    const { error, value } = schema.validate(req.query || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const result = await listConversations(req.user, value);
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/dm/get-or-create', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ otherUserId: Joi.string().required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const convo = await getOrCreateDM(req.user, value);
    return res.success(convo);
  } catch (e) { next(e); }
});

router.post('/listing/get-or-create', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ listingId: Joi.string().required(), sellerId: Joi.string().required() });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const convo = await getOrCreateFromListing(req.user, value);
    return res.success(convo);
  } catch (e) { next(e); }
});

router.get('/conversations/:id/messages', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ page: Joi.number().min(1).default(1), limit: Joi.number().min(1).max(100).default(30) });
    const { error, value } = schema.validate(req.query || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const msgs = await listMessages(req.user, { conversationId: req.params.id, ...value });
    return res.success(msgs);
  } catch (e) { next(e); }
});

router.post('/conversations/:id/messages', authRequired, sendLimiter, async (req, res, next) => {
  try {
    const result = await sendInConversation(req.user, { conversationId: req.params.id, text: req.body?.text, photosBase64: req.body?.photosBase64 });
    return res.success(result);
  } catch (e) { next(e); }
});

router.post('/conversations/:id/read', authRequired, async (req, res, next) => {
  try {
    const convo = await markRead(req.user, { conversationId: req.params.id });
    return res.success(convo);
  } catch (e) { next(e); }
});

module.exports = router; 