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
const scheduleRoutes = require('./schedule');
const { authRequired } = require('../middlewares/auth');
const { getBalances } = require('../services/expenseService');
const Joi = require('joi');
const hangoutsRoutes = require('./hangouts');
const moderationRoutes = require('./moderation');
const messagesRoutes = require('./messages');
const notificationsRoutes = require('./notifications');
const devicesRoutes = require('./devices');
const axios = require('axios');
const { loadEnv } = require('../config/env');

const router = Router();

// Public health check
router.get('/healthz', (_req, res) => res.json({ ok: true }));

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
router.use('/schedule', scheduleRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/devices', devicesRoutes);
router.use('/messages', messagesRoutes);
router.use('/moderation', moderationRoutes);

// Convenience balances endpoint (kept for compatibility)
router.get('/balances', authRequired, async (req, res, next) => {
  try {
    const result = await getBalances(req.user, {});
    return res.success(result);
  } catch (e) {
    next(e);
  }
});

// Directions and ETA using Google Directions API with fallback
router.get('/nav/route', authRequired, async (req, res, next) => {
  try {
    const schema = Joi.object({
      originLat: Joi.number().required(),
      originLng: Joi.number().required(),
      destLat: Joi.number().required(),
      destLng: Joi.number().required(),
    });
    const { error, value } = schema.validate(req.query);
    if (error) {
      const err = new Error('Invalid input');
      err.status = 400; err.code = 'VALIDATION_ERROR';
      err.details = error.details.map((d) => d.message);
      throw err;
    }

    const { GOOGLE_MAPS_API_KEY } = loadEnv();
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = 'https://maps.googleapis.com/maps/api/directions/json';
        const params = {
          key: GOOGLE_MAPS_API_KEY,
          origin: `${value.originLat},${value.originLng}`,
          destination: `${value.destLat},${value.destLng}`,
          mode: 'walking',
        };
        const resp = await axios.get(url, { params, timeout: 10000 });
        const route = (resp.data?.routes || [])[0];
        const leg = (route?.legs || [])[0];
        if (route && leg) {
          const distanceMeters = leg.distance?.value ?? null;
          const etaMinutes = leg.duration ? Math.round((leg.duration.value || 0) / 60) : null;
          const polyline = route.overview_polyline?.points || null;
          return res.success({ distanceMeters, etaMinutes, polyline, mode: 'walk' });
        }
      } catch (_) {
        // fall through to haversine
      }
    }

    // Haversine fallback
    const R = 6371000; // meters
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(value.destLat - value.originLat);
    const dLng = toRad(value.destLng - value.originLng);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(value.originLat)) * Math.cos(toRad(value.destLat)) * Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = R * c;
    const walkingMps = 1.3; // ~4.7 km/h
    const etaMinutes = Math.ceil(distanceMeters / walkingMps / 60);
    return res.success({ distanceMeters, etaMinutes, polyline: null, mode: 'walk' });
  } catch (e) { next(e); }
});

module.exports = { router }; 