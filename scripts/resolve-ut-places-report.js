#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function main() {
	const apiBase = process.env.API_BASE || 'http://localhost:4000';
	const token = process.env.TOKEN || '';
	const placesPath = path.resolve(__dirname, '../mobile/src/assets/ut_places.json');
	const raw = fs.readFileSync(placesPath, 'utf8');
	const places = JSON.parse(raw);
	const payload = places.map((p) => ({ id: p.placeId, name: p.placeName }));
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const resp = await axios.post(`${apiBase}/locations/resolve/places`, payload, { headers });
	const items = resp.data?.data?.items || [];
	const byId = Object.fromEntries(items.map((i) => [i.id, i]));
	const report = places.map((p) => ({
		placeId: p.placeId,
		placeName: p.placeName,
		kind: p.kind || null,
		lat: byId[p.placeId]?.lat ?? null,
		lng: byId[p.placeId]?.lng ?? null,
		formatted_address: byId[p.placeId]?.formatted_address || null,
		placeId_google: byId[p.placeId]?.placeId || null,
	}));
	// Print CSV
	const csvHeader = 'placeId,placeName,kind,lat,lng,formatted_address,placeId_google';
	const csvBody = report.map((r) => [r.placeId, JSON.stringify(r.placeName), r.kind, r.lat, r.lng, JSON.stringify(r.formatted_address), r.placeId_google].join(','));
	console.log(csvHeader);
	for (const line of csvBody) console.log(line);
	// Also write JSON file next to script
	const outJson = path.resolve(process.cwd(), 'ut_places_resolve_report.json');
	fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
	console.error(`Wrote JSON report to ${outJson}`);
}

main().catch((e) => { console.error(e?.response?.data || e?.message || e); process.exit(1); }); 