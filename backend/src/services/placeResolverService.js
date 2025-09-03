const axios = require('axios');
const PlaceLookup = require('../models/PlaceLookup');
const { loadEnv } = require('../config/env');

const CAMPUS_CENTER = { lat: 30.285, lng: -97.735 };
const MAX_DIST_METERS = 3000; // ~3 km
const LOC_BIAS_RADIUS = 2000; // ~2 km

function haversineMeters(a, b) {
	const R = 6371e3;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
	return R * c;
}

function isAustinAddress(addr) {
	return typeof addr === 'string' && /Austin,\s*TX/i.test(addr);
}

function buildTextQuery(name) {
	return `${name}, University of Texas at Austin`;
}

async function findPlace(textQuery) {
	const { GOOGLE_MAPS_API_KEY } = loadEnv();
	if (!GOOGLE_MAPS_API_KEY) { const err = new Error('Maps API key missing'); err.status = 500; err.code = 'CONFIG_ERROR'; throw err; }
	const url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
	const params = {
		key: GOOGLE_MAPS_API_KEY,
		input: textQuery,
		inputtype: 'textquery',
		fields: 'geometry,formatted_address,place_id,name',
		locationbias: `circle:${LOC_BIAS_RADIUS}@${CAMPUS_CENTER.lat},${CAMPUS_CENTER.lng}`,
	};
	const resp = await axios.get(url, { params });
	const candidates = Array.isArray(resp.data?.candidates) ? resp.data.candidates : [];
	return candidates;
}

function pickBestCandidate(candidates) {
	if (!Array.isArray(candidates) || candidates.length === 0) return null;
	const withScores = candidates.map((c) => {
		const lat = c?.geometry?.location?.lat;
		const lng = c?.geometry?.location?.lng;
		const addr = c?.formatted_address || '';
		let score = 0;
		if (isAustinAddress(addr)) score += 10;
		if (lat != null && lng != null) {
			const dist = haversineMeters(CAMPUS_CENTER, { lat, lng });
			if (dist <= MAX_DIST_METERS) score += 10 - Math.min(10, dist / 300); // prefer closer
		}
		return { c, score };
	});
	withScores.sort((a, b) => b.score - a.score);
	return withScores[0]?.c || candidates[0];
}

async function resolveAndCache({ sourceType, key, name }) {
	const textQuery = buildTextQuery(name);
	let rec = await PlaceLookup.findOne({ sourceType, key });
	if (rec && rec.lat && rec.lng && rec.placeId && rec.formattedAddress) return rec.toJSON();
	const candidates = await findPlace(textQuery);
	const best = pickBestCandidate(candidates);
	if (!best) {
		// cache negative result to avoid repeated calls
		rec = rec || new PlaceLookup({ sourceType, key, name, query: textQuery });
		await rec.save();
		return rec.toJSON();
	}
	const lat = best?.geometry?.location?.lat;
	const lng = best?.geometry?.location?.lng;
	const placeId = best?.place_id || null;
	const formattedAddress = best?.formatted_address || null;
	rec = rec || new PlaceLookup({ sourceType, key, name, query: textQuery });
	rec.placeId = placeId;
	rec.formattedAddress = formattedAddress;
	rec.lat = lat;
	rec.lng = lng;
	await rec.save();
	return rec.toJSON();
}

module.exports = { resolveAndCache }; 