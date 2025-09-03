const { Router } = require('express');
const Joi = require('joi');
const Notification = require('../models/Notification');
const { authRequired } = require('../middlewares/auth');
const { notifyUsers } = require('../services/notificationService');

const router = Router();

router.get('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ status: Joi.string().valid('unread', 'all').default('all'), page: Joi.number().min(1).default(1), limit: Joi.number().min(1).max(100).default(20) });
    const { error, value } = schema.validate(req.query || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }
    const filter = { userId: req.user._id };
    if (value.status === 'unread') filter.readAt = null;
    const skip = (value.page - 1) * value.limit;
    const items = await Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(value.limit);
    return res.success(items.map((n) => n.toJSON()));
  } catch (e) { next(e); }
});

router.get('/unread_count', authRequired, async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, readAt: null });
    return res.success({ count });
  } catch (e) { next(e); }
});

router.post('/:id/read', authRequired, async (req, res, next) => {
  try {
    const n = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!n) { const err = new Error('Not found'); err.status = 404; err.code = 'NOT_FOUND'; throw err; }
    n.readAt = new Date(); n.status = n.status === 'sent' ? 'read' : n.status; await n.save();
    return res.success(n.toJSON());
  } catch (e) { next(e); }
});

router.post('/read_all', authRequired, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, readAt: null }, { $set: { readAt: new Date(), status: 'read' } });
    return res.success({ ok: true });
  } catch (e) { next(e); }
});

// New: roommate ping
router.post('/ping', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      toUserId: Joi.string().required(),
      contextType: Joi.string().valid('chore', 'expense').required(),
      contextId: Joi.string().required(),
      title: Joi.string().optional(),
      body: Joi.string().optional(),
    });
    const { error, value } = schema.validate(req.body || {});
    if (error) { const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err; }

    // Persist lightweight notification for audit and auto-dismiss
    const notif = await Notification.create({
      userId: value.toUserId,
      type: 'ping',
      status: 'sent',
      data: { contextType: value.contextType, contextId: value.contextId, fromUserId: req.user._id },
      title: value.title || 'Ping',
      body: value.body || 'You have a reminder',
    });

    await notifyUsers([value.toUserId], 'inbox', notif.title, notif.body);

    return res.success({ ok: true, id: String(notif._id) });
  } catch (e) { next(e); }
});

module.exports = router; 