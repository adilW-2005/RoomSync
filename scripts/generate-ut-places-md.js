#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

async function httpPostJson(url, body, headers = {}) {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`HTTP ${res.status}: ${text}`);
	}
	return await res.json();
}

async function ensureToken() {
	const email = process.env.EMAIL || `utplaces_${Date.now()}@local.test`;
	const password = process.env.PASSWORD || 'test1234';
	try {
		const reg = await httpPostJson(`${API_BASE}/auth/register`, { email, password, name: 'UT Places Bot' });
		return reg?.data?.access_token;
	} catch (_) {
		const login = await httpPostJson(`${API_BASE}/auth/login`, { email, password });
		return login?.data?.access_token;
	}
}

function toChunks(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

function fmtNum(n) { return n == null ? '' : String(n); }

async function main() {
	const token = process.env.TOKEN || await ensureToken();
	const headers = token ? { Authorization: `Bearer ${token}` } : {};
	const placesPath = path.resolve(__dirname, '../mobile/src/assets/ut_places.json');
	const raw = fs.readFileSync(placesPath, 'utf8');
	const places = JSON.parse(raw);
	const chunks = toChunks(places.map((p) => ({ id: p.placeId, name: p.placeName, kind: p.kind })), 40);
	const resolved = new Map();
	for (const chunk of chunks) {
		const r = await httpPostJson(`${API_BASE}/locations/resolve/places`, chunk.map(({ id, name }) => ({ id, name })), headers);
		for (const item of (r?.data?.items || [])) {
			resolved.set(item.id, item);
		}
	}
	// Build Markdown
	let md = '# UT Places Resolved Locations\n\n';
	md += `Generated at: ${new Date().toISOString()}\n\n`;
	md += '| Name | Resolved Address | Lat | Lng | Google Place ID |\n';
	md += '| --- | --- | --- | --- | --- |\n';
	for (const p of places) {
		const r = resolved.get(p.placeId) || {};
		md += `| ${p.placeName} | ${r.formatted_address || ''} | ${fmtNum(r.lat)} | ${fmtNum(r.lng)} | ${r.placeId || ''} |\n`;
	}
	const outPath = path.resolve(__dirname, '../docs/ut_places_resolved.md');
	fs.writeFileSync(outPath, md);
	console.log(`Wrote ${outPath}`);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); }); 