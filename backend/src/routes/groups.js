const { Router } = require('express');
const Joi = require('joi');
const { authRequired } = require('../middlewares/auth');
const { createGroup, joinGroupByCode, joinGroupByInvite, getCurrentGroup, getMyGroups, switchCurrentGroup, updateCurrentGroup, regenerateCurrentGroupCode, removeMemberFromCurrentGroup, createInvite, listInvites, revokeInvite } = require('../services/groupService');

const router = Router();

router.post('/', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ name: Joi.string().min(1).required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await createGroup(req.user, value.name);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.get('/', authRequired, async (req, res, next) => {
  try {
    const result = await getMyGroups(req.user);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/switch', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ groupId: Joi.string().required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await switchCurrentGroup(req.user, value.groupId);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/join', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ code: Joi.string().length(6).required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await joinGroupByCode(req.user, value.code.toUpperCase());
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/join/invite', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ inviteCode: Joi.string().length(8).required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await joinGroupByInvite(req.user, value.inviteCode.toUpperCase());
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.get('/current', authRequired, async (req, res, next) => {
  try {
    const result = await getCurrentGroup(req.user);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.patch('/current', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ name: Joi.string().min(1).required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await updateCurrentGroup(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/current/regenerate-code', authRequired, async (req, res, next) => {
  try {
    const result = await regenerateCurrentGroupCode(req.user);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/current/remove-member', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ userId: Joi.string().required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await removeMemberFromCurrentGroup(req.user, value.userId);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/current/invites', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ expiresInHours: Joi.number().integer().min(1).max(720).optional() });
    const { error, value } = schema.validate(req.body || {});
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await createInvite(req.user, value);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.get('/current/invites', authRequired, async (req, res, next) => {
  try {
    const result = await listInvites(req.user);
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

router.post('/current/invites/revoke', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({ code: Joi.string().length(8).required() });
    const { error, value } = schema.validate(req.body);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      err.details = error.details.map(d => d.message);
      throw err;
    }
    const result = await revokeInvite(req.user, value.code.toUpperCase());
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router; 