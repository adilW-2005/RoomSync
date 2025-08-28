const { Router } = require('express');
const { authRequired } = require('../middlewares/auth');
const { upload, parseScheduleWithVision, normalizeEvents, saveEventsForUser, getNextClass, listEventsForUser } = require('../services/scheduleService');

const router = Router();

router.post('/uploadScreenshot', authRequired, upload.single('image'), async (req, res, next) => {
	try {
		if (!req.file?.buffer) {
			const err = new Error('Image is required');
			err.status = 400; err.code = 'VALIDATION_ERROR';
			throw err;
		}
		const raw = await parseScheduleWithVision(req.file.buffer);
		const normalized = normalizeEvents(raw);
		const saved = await saveEventsForUser(req.user.id, normalized);
		return res.success({ events: saved });
	} catch (e) { next(e); }
});

router.post('/save', authRequired, async (req, res, next) => {
	try {
		const events = Array.isArray(req.body?.events) ? req.body.events : [];
		if (!events.length) {
			const err = new Error('events required');
			err.status = 400; err.code = 'VALIDATION_ERROR';
			throw err;
		}
		const normalized = normalizeEvents(events);
		const saved = await saveEventsForUser(req.user.id, normalized);
		return res.success({ events: saved });
	} catch (e) { next(e); }
});

router.get('/next', authRequired, async (req, res, next) => {
	try {
		const nextClass = await getNextClass(req.user.id);
		return res.success(nextClass || null);
	} catch (e) { next(e); }
});

router.get('/', authRequired, async (req, res, next) => {
	try {
		const all = await listEventsForUser(req.user.id);
		return res.success({ events: all });
	} catch (e) { next(e); }
});

module.exports = router; 