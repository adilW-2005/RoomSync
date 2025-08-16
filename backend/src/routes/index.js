const { Router } = require('express');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const groupsRoutes = require('./groups');
const locationsRoutes = require('./locations');
const choresRoutes = require('./chores');
const eventsRoutes = require('./events');
const expensesRoutes = require('./expenses');
const inventoryRoutes = require('./inventory');
const listingsRoutes = require('./listings');
const ratingsRoutes = require('./ratings');
const { authRequired } = require('../middlewares/auth');
const { getBalances } = require('../services/expenseService');
const Joi = require('joi');
const hangoutsRoutes = require('./hangouts');
const moderationRoutes = require('./moderation');

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/groups', groupsRoutes);
router.use('/locations', locationsRoutes);
router.use('/chores', choresRoutes);
router.use('/events', eventsRoutes);
router.use('/expenses', expensesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/listings', listingsRoutes);
router.use('/ratings', ratingsRoutes);
router.use('/hangouts', hangoutsRoutes);
router.use('/moderation', moderationRoutes);

// Spec requires GET /balances as computed summary
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

module.exports = { router }; 