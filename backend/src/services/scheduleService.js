const multer = require('multer');
const { OpenAI } = require('openai');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { loadEnv } = require('../config/env');
const ScheduleEvent = require('../models/ScheduleEvent');
const { resolveAndCache } = require('./placeResolverService');

// dayjs setup
dayjs.extend(utc);
dayjs.extend(timezone);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function expandDaysToken(token) {
	const map = { M: 'M', T: 'T', W: 'W', Th: 'Th', R: 'Th', F: 'F' };
	const result = [];
	let i = 0;
	while (i < token.length) {
		if (token[i] === 'T' && token[i + 1] === 'h') { result.push('Th'); i += 2; continue; }
		const ch = token[i];
		if (map[ch]) result.push(map[ch]);
		i += 1;
	}
	return result;
}

function to24h(timeStr) {
	try {
		const trimmed = String(timeStr || '').trim();
		// already 24h
		const m24 = /^(\d{2}):(\d{2})$/.exec(trimmed);
		if (m24) return `${m24[1]}:${m24[2]}`;
		// e.g., "8:00 AM" or "12:15PM"
		const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
		if (!m) return null;
		let h = parseInt(m[1], 10);
		const min = parseInt(m[2], 10);
		const mer = m[3].toUpperCase();
		if (mer === 'AM') { if (h === 12) h = 0; }
		if (mer === 'PM') { if (h !== 12) h += 12; }
		return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
	} catch (_) { return null; }
}

async function resolveBuildingLocation(buildingCode) {
	try {
		const code = String(buildingCode || '').trim().toUpperCase();
		if (!code) return null;
		// Attempt to find building name from UT dataset if available; fallback to code itself
		let name = code;
		try {
			const utList = require('../data/ut_buildings.json');
			const found = (Array.isArray(utList) ? utList : []).find((b) => String(b.code).toUpperCase() === code);
			if (found?.name) name = found.name;
		} catch (_) {}
		const rec = await resolveAndCache({ sourceType: 'building', key: code, name });
		if (rec?.lat != null && rec?.lng != null) return { lat: rec.lat, lng: rec.lng };
		return null;
	} catch (_) { return null; }
}

async function parseScheduleWithVision(imageBuffer) {
	const { OPENAI_API_KEY } = loadEnv();
	if (!OPENAI_API_KEY) {
		const err = new Error('OpenAI API key missing');
		err.status = 500;
		err.code = 'CONFIG_ERROR';
		throw err;
	}
	const client = new OpenAI({ apiKey: OPENAI_API_KEY });
	const base64 = imageBuffer.toString('base64');
	const systemPrompt = `You are an expert at reading University of Texas at Austin student class schedule screenshots.
Return ONLY a valid JSON array with objects having exact keys: course, building, room, days, start_time, end_time.
- course: like C S 311 or MATH 408C (string; keep spacing exactly as shown if present)
- building: UT building code like WEL, GDC, RLM (string; 2–4 uppercase letters only)
- room: like 1.316 or 2.216 (string)
- days: use exact visible day tokens: M, T, W, Th, F. If multiple days are clearly printed together (e.g., TTh), return a combined token. If only one day is visible, return that single day only.
- start_time: like "8:00 AM" (string)
- end_time: like "8:50 AM" (string)
Important:
- Do NOT include any extra keys (no title/name/notes/etc.).
- Do NOT infer additional days beyond what is visibly printed in the screenshot. A single-day block must remain single-day.
- Preserve building codes and room numbers exactly as printed. Avoid guessing.
- Use UT timing heuristics only when days are ambiguous (illegible): ~50–70 minutes typically MWF; ~80–100 minutes typically TTh.
- Output ONLY the JSON array, no markdown.`;
	const userPrompt = 'Parse this UT Austin weekly class schedule screenshot into JSON as specified.';
	const resp = await client.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: [
				{ type: 'text', text: userPrompt },
				{ type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
			] },
		],
		temperature: 0,
	});
	const text = resp?.choices?.[0]?.message?.content || '[]';
	let parsed = [];
	try { parsed = JSON.parse(text); } catch (_) { parsed = []; }
	if (!Array.isArray(parsed)) parsed = [];
	return parsed;
}

async function normalizeEvents(raw) {
	function computeDurationMinutes(start24, end24) {
		try {
			const [sh, sm] = start24.split(':').map((x) => parseInt(x, 10));
			const [eh, em] = end24.split(':').map((x) => parseInt(x, 10));
			return (eh * 60 + em) - (sh * 60 + sm);
		} catch (_) { return null; }
	}
	function applyDayHeuristics(daysArr, start24, end24) {
		const dur = computeDurationMinutes(start24, end24);
		if (!dur) return daysArr;
		const key = (daysArr || []).join('');
		if ((dur >= 50 && dur <= 70) && (key === 'TTh' || key === 'TR')) {
			return ['M','W','F'];
		}
		if ((dur >= 80 && dur <= 100) && (key === 'MWF')) {
			return ['T','Th'];
		}
		return daysArr;
	}
	function dayTokenFromDate(dateStr) {
		try {
			const d = dayjs(dateStr);
			if (!d.isValid()) return null;
			const map = ['Su','M','T','W','Th','F','Sa'];
			const token = map[d.day()];
			if (['M','T','W','Th','F'].includes(token)) return [token];
			return null;
		} catch (_) { return null; }
	}
	// First pass: parse and basic normalization
	const prelim = raw.map((r) => {
		const rawDaysToken = String(r.days || '');
		let daysExpanded = [];
		if (Array.isArray(r.days) && r.days.length) { daysExpanded = r.days.map(String); }
		else if (rawDaysToken) { daysExpanded = expandDaysToken(rawDaysToken); }
		else if (r.date) { const d = dayTokenFromDate(r.date); if (d) daysExpanded = d; }
		const start24 = to24h(r.start_time);
		const end24 = to24h(r.end_time);
		daysExpanded = applyDayHeuristics(daysExpanded, start24, end24);
		const building = String(r.building || '').toUpperCase().trim();
		const loc = null; // resolved asynchronously below
		return {
			course: String(r.course || '').trim(),
			building,
			room: r.room ? String(r.room).trim() : undefined,
			days: daysExpanded,
			start_time: start24 || null,
			end_time: end24 || null,
			location: loc || undefined,
		};
	}).filter(e => e.course && e.building && e.days?.length && e.start_time && e.end_time);
	// Second pass: aggregate identical meeting slots and union their days (restores M/W in MWF, etc.)
	const dayOrder = new Map([['M',0],['T',1],['W',2],['Th',3],['F',4]]);
	const groups = new Map();
	for (const e of prelim) {
		const key = `${e.course}|${e.building}|${e.room || ''}|${e.start_time}|${e.end_time}`;
		if (!groups.has(key)) {
			groups.set(key, { ...e, days: new Set(e.days) });
		} else {
			const g = groups.get(key);
			for (const d of e.days) g.days.add(d);
		}
	}
	const aggregated = Array.from(groups.values()).map((g) => ({
		course: g.course,
		building: g.building,
		room: g.room,
		start_time: g.start_time,
		end_time: g.end_time,
		location: g.location,
		days: Array.from(g.days).sort((a, b) => (dayOrder.get(a) ?? 99) - (dayOrder.get(b) ?? 99)),
	}));

	// Resolve building coordinates for each unique building in aggregated
	const uniqueBuildings = Array.from(new Set(aggregated.map((a) => a.building).filter(Boolean)));
	const codeToLoc = {};
	await Promise.all(uniqueBuildings.map(async (code) => { codeToLoc[code] = await resolveBuildingLocation(code); }));
	for (const a of aggregated) {
		const loc = codeToLoc[a.building];
		if (loc) a.location = loc;
	}
	return aggregated;
}

async function saveEventsForUser(userId, events) {
	await ScheduleEvent.deleteMany({ userId });
	const docs = events.map((e) => ({ ...e, userId }));
	await ScheduleEvent.insertMany(docs);
	return docs;
}

function getUpcomingForToday(now, events) {
	// now: Date. events: list with 24h time and days
	const dayMap = ['Su','M','T','W','Th','F','Sa'];
	const day = dayMap[now.getDay()];
	const todays = events.filter((e) => e.days.includes(day));
	const nowStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
	const next = todays
		.map((e) => ({ ...e, startStr: e.start_time }))
		.filter((e) => e.startStr >= nowStr)
		.sort((a, b) => a.startStr.localeCompare(b.startStr))[0];
	return next || null;
}

// New: timezone-aware next across the week
function getNextAcrossWeek(nowDate, events, tz = 'America/Chicago') {
	if (!Array.isArray(events) || events.length === 0) return null;
	const weekdays = ['Su','M','T','W','Th','F','Sa'];
	const now = dayjs(nowDate).tz(tz);
	for (let offset = 0; offset < 7; offset += 1) {
		const d = now.add(offset, 'day');
		const dayToken = weekdays[d.day()];
		const todays = events.filter((e) => e.days.includes(dayToken));
		if (todays.length === 0) continue;
		const nowStr = offset === 0 ? `${String(d.hour()).padStart(2,'0')}:${String(d.minute()).padStart(2,'0')}` : '00:00';
		const next = todays
			.map((e) => ({ ...e, startStr: e.start_time }))
			.filter((e) => e.startStr >= nowStr)
			.sort((a, b) => a.startStr.localeCompare(b.startStr))[0];
		if (next) return next;
	}
	return null;
}

async function getNextClass(userId) {
	const all = await ScheduleEvent.find({ userId }).lean();
	// Prefer timezone-aware next across the coming days
	const next = getNextAcrossWeek(new Date(), all, 'America/Chicago');
			return next;
}

async function listEventsForUser(userId) {
	const dayOrder = new Map([['M',0],['T',1],['W',2],['Th',3],['F',4]]);
	const all = await ScheduleEvent.find({ userId }).lean();
	// Sort by earliest day then by start_time
	return all.sort((a, b) => {
		const aDay = (a.days || []).map((d) => dayOrder.get(d) ?? 99).sort((x, y) => x - y)[0] ?? 99;
		const bDay = (b.days || []).map((d) => dayOrder.get(d) ?? 99).sort((x, y) => x - y)[0] ?? 99;
		if (aDay !== bDay) return aDay - bDay;
		return String(a.start_time).localeCompare(String(b.start_time));
	});
}

module.exports = {
	upload,
	parseScheduleWithVision,
	normalizeEvents,
	saveEventsForUser,
	getNextClass,
	listEventsForUser,
}; 