const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
const PlaceLookup = require('../../src/models/PlaceLookup');

jest.mock('axios', () => ({ get: jest.fn() }));
const axios = require('axios');

function sign(user) {
	const secret = process.env.JWT_SECRET || 'test';
	return jwt.sign({ sub: user._id.toString() }, secret, { expiresIn: '1h' });
}

function mockCandidates({ name = 'Test Place', austin = true, lat = 30.2855, lng = -97.7355 } = {}) {
	return {
		data: {
			candidates: [
				{ name: `${name} (Bad Far)`, formatted_address: 'Dallas, TX 75001', place_id: 'far', geometry: { location: { lat: 32.7767, lng: -96.797 } } },
				{ name: `${name} (Austin Near)`, formatted_address: austin ? 'Austin, TX 78712' : 'Houston, TX 77001', place_id: 'near', geometry: { location: { lat, lng } } },
			],
		},
	};
}

describe('Locations Resolver', () => {
	let app; let user; let token;
	beforeAll(async () => { app = createApp(); });
	beforeEach(async () => {
		await PlaceLookup.deleteMany({});
		user = await User.create({ email: 'loc@test.com', passwordHash: 'x', name: 'Loc T' });
		token = sign(user);
	});
	afterAll(async () => { await mongoose.connection.close(); });

	test('resolve places prefers Austin within 3km and caches', async () => {
		axios.get.mockResolvedValueOnce(mockCandidates({ name: 'Castilian', austin: true, lat: 30.2871, lng: -97.7429 }));
		const payload = [{ id: 'the-castilian', name: 'The Castilian' }];
		const res1 = await request(app).post('/locations/resolve/places').set('Authorization', `Bearer ${token}`).send(payload);
		expect(res1.status).toBe(200);
		expect(res1.body?.data?.items?.[0]?.lat).toBeCloseTo(30.2871, 4);
		expect(res1.body?.data?.items?.[0]?.lng).toBeCloseTo(-97.7429, 4);
		// second call should hit cache (axios not called again)
		const res2 = await request(app).post('/locations/resolve/places').set('Authorization', `Bearer ${token}`).send(payload);
		expect(res2.status).toBe(200);
		expect(axios.get).toHaveBeenCalledTimes(1);
	});

	test('resolve buildings uses provided code+name', async () => {
		axios.get.mockResolvedValueOnce(mockCandidates({ name: 'Gates Dell Complex', austin: true, lat: 30.2861, lng: -97.7368 }));
		const res = await request(app).post('/locations/resolve/buildings').set('Authorization', `Bearer ${token}`).send([{ code: 'GDC', name: 'GATES DELL COMPLEX' }]);
		expect(res.status).toBe(200);
		expect(res.body?.data?.items?.[0]?.code).toBe('GDC');
		expect(res.body?.data?.items?.[0]?.lat).toBeCloseTo(30.2861, 4);
		expect(res.body?.data?.items?.[0]?.lng).toBeCloseTo(-97.7368, 4);
	});
}); 