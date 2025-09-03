#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../backend/src/app');
const User = require('../backend/src/models/User');
const PlaceLookup = require('../backend/src/models/PlaceLookup');

let mongo;

function sign(user) {
	const secret = process.env.JWT_SECRET || 'test';
	return jwt.sign({ sub: user._id.toString() }, secret, { expiresIn: '1h' });
}

function fmtNum(n) { return n == null ? '' : String(n); }

async function setupDatabase(quiet = false) {
	process.env.NODE_ENV = 'test';
	process.env.JWT_SECRET = process.env.JWT_SECRET || 'test';
	
	if (!quiet) console.log('Starting in-memory MongoDB...');
	mongo = await MongoMemoryServer.create();
	const uri = mongo.getUri('roomsync_test');
	await mongoose.connect(uri);
	if (!quiet) console.log('Database connected.');
}

async function teardownDatabase(quiet = false) {
	if (!quiet) console.log('Closing database connection...');
	await mongoose.disconnect();
	if (mongo) await mongo.stop();
}

async function setupAuth() {
	await PlaceLookup.deleteMany({});
	const user = await User.create({ email: 'resolver@test.com', passwordHash: 'x', name: 'Resolver Bot' });
	const token = sign(user);
	return token;
}

async function resolvePlaces(app, token, quiet = false) {
	const placesPath = path.resolve(__dirname, '../mobile/src/assets/ut_places.json');
	const raw = fs.readFileSync(placesPath, 'utf8');
	const places = JSON.parse(raw);
	
	console.log('\n## Places Resolution Results\n');
	console.log('| Name | Resolved Address | Lat | Lng |');
	console.log('| --- | --- | --- | --- |');
	
	// Process places in smaller batches to avoid overwhelming the API
	const batchSize = 5;
	for (let i = 0; i < places.length; i += batchSize) {
		const batch = places.slice(i, i + batchSize);
		const payload = batch.map((p) => ({ id: p.placeId, name: p.placeName }));
		
		try {
			const res = await request(app)
				.post('/locations/resolve/places')
				.set('Authorization', `Bearer ${token}`)
				.send(payload);
			
			if (res.status !== 200) {
				if (!quiet) console.error(`Error resolving batch ${i}-${i+batchSize}: ${res.status}`);
				for (const p of batch) {
					console.log(`| ${p.placeName} | ERROR | | |`);
				}
				continue;
			}
			
			const items = res.body?.data?.items || [];
			const byId = Object.fromEntries(items.map((i) => [i.id, i]));
			
			for (const p of batch) {
				const r = byId[p.placeId] || {};
				console.log(`| ${p.placeName} | ${r.formatted_address || ''} | ${fmtNum(r.lat)} | ${fmtNum(r.lng)} |`);
			}
		} catch (error) {
			if (!quiet) console.error(`Error processing batch ${i}-${i+batchSize}:`, error.message);
			for (const p of batch) {
				console.log(`| ${p.placeName} | ERROR | | |`);
			}
		}
	}
}

async function resolveBuildings(app, token, quiet = false) {
	const bPath = path.resolve(__dirname, '../backend/src/data/ut_buildings.json');
	if (!fs.existsSync(bPath)) {
		console.log('\n## Buildings File Not Found\n');
		console.log(`Expected file at: ${bPath}`);
		return;
	}
	
	const raw = fs.readFileSync(bPath, 'utf8');
	const list = JSON.parse(raw);
	
	console.log('\n## Buildings Resolution Results\n');
	console.log('| Code | Name | Resolved Address | Lat | Lng |');
	console.log('| --- | --- | --- | --- | --- |');
	
	// Process buildings in smaller batches
	const batchSize = 5;
	for (let i = 0; i < list.length; i += batchSize) {
		const batch = list.slice(i, i + batchSize);
		const payload = batch.map((b) => ({ code: b.code, name: b.name }));
		
		try {
			const res = await request(app)
				.post('/locations/resolve/buildings')
				.set('Authorization', `Bearer ${token}`)
				.send(payload);
			
			if (res.status !== 200) {
				if (!quiet) console.error(`Error resolving batch ${i}-${i+batchSize}: ${res.status}`);
				for (const b of batch) {
					console.log(`| ${b.code} | ${b.name} | ERROR | | |`);
				}
				continue;
			}
			
			const items = res.body?.data?.items || [];
			const byCode = Object.fromEntries(items.map((i) => [i.code, i]));
			
			for (const b of batch) {
				const r = byCode[b.code] || {};
				console.log(`| ${b.code} | ${b.name} | ${r.formatted_address || ''} | ${fmtNum(r.lat)} | ${fmtNum(r.lng)} |`);
			}
		} catch (error) {
			if (!quiet) console.error(`Error processing batch ${i}-${i+batchSize}:`, error.message);
			for (const b of batch) {
				console.log(`| ${b.code} | ${b.name} | ERROR | | |`);
			}
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const mode = (args.find(arg => !arg.startsWith('--')) || 'places').toLowerCase();
	const quiet = args.includes('--quiet') || args.includes('-q');
	
	// Suppress all debug output in quiet mode
	if (quiet) {
		process.env.NODE_ENV = 'test';
		process.env.FORCE_COLOR = '0'; // Disable colors
		
		// Capture and suppress stderr
		const originalStderr = process.stderr.write;
		process.stderr.write = function() { return true; };
		
		// Suppress morgan logs by overriding console methods during app creation
		const originalLog = console.log;
		const originalError = console.error;
		const originalWarn = console.warn;
		
		console.error = () => {};
		console.warn = () => {};
		
		// Restore console.log for our output
		console.log = originalLog;
	}
	
	try {
		await setupDatabase(quiet);
		
		if (!quiet) {
			console.log('Creating app and setting up authentication...');
		}
		const app = createApp();
		const token = await setupAuth();
		if (!quiet) {
			console.log('Setup complete. Starting location resolution...');
		}
		
		// Add header for markdown
		if (quiet) {
			console.log('# UT Location Resolution Results\n');
			console.log('Generated on:', new Date().toISOString());
			console.log('');
		}
		
		if (mode === 'places') {
			await resolvePlaces(app, token, quiet);
		} else if (mode === 'buildings') {
			await resolveBuildings(app, token, quiet);
		} else if (mode === 'both') {
			await resolvePlaces(app, token, quiet);
			await resolveBuildings(app, token, quiet);
		} else {
			throw new Error('Usage: node scripts/resolve-and-print.js [places|buildings|both] [--quiet]');
		}
		
		if (quiet) {
			console.log('\n---\n');
			console.log('*Results generated by RoomSync location resolution service*');
		}
	} finally {
		await teardownDatabase(quiet);
	}
}

main().catch((e) => { 
	console.error('Error:', e?.message || e); 
	teardownDatabase();
	process.exit(1); 
}); 