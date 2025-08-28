const { Router } = require('express');
const axios = require('axios');
const { authRequired } = require('../middlewares/auth');
const { loadEnv } = require('../config/env');

const router = Router();

// Simple in-memory cache: userId -> last route response
const lastRouteByUser = new Map();

router.get('/route', authRequired, async (req, res, next) => {
	try {
		const { originLat, originLng, destLat, destLng } = req.query;
		if (!originLat || !originLng || !destLat || !destLng) {
			const err = new Error('Missing coordinates'); err.status = 400; err.code = 'VALIDATION_ERROR'; throw err;
		}
		const { GOOGLE_MAPS_API_KEY } = loadEnv();
		if (!GOOGLE_MAPS_API_KEY) { const err = new Error('Maps API key missing'); err.status = 500; err.code = 'CONFIG_ERROR'; throw err; }
		const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=walking&key=${GOOGLE_MAPS_API_KEY}`;
		console.log('[nav] request route', { userId: req.user._id?.toString?.(), originLat, originLng, destLat, destLng });
		const resp = await axios.get(url);
		const route = resp.data?.routes?.[0];
		const leg = route?.legs?.[0];
		const etaMin = leg?.duration?.value ? Math.round(leg.duration.value / 60) : null;
		const distanceMeters = leg?.distance?.value ?? null;
		const payload = { etaMinutes: etaMin, distanceMeters, polyline: route?.overview_polyline?.points || null };
		lastRouteByUser.set(String(req.user._id), { ...payload, cachedAt: new Date().toISOString() });
		console.log('[nav] route success', { userId: req.user._id?.toString?.(), etaMinutes: etaMin, distanceMeters });
		return res.success(payload);
	} catch (e) {
		console.warn('[nav] route error', e?.message || e);
		const cached = lastRouteByUser.get(String(req.user._id));
		if (cached) {
			return res.success({ ...cached, cached: true });
		}
		next(e);
	}
});

module.exports = router; 