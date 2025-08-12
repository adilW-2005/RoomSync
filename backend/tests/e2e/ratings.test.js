const request = require('supertest');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
const Rating = require('../../src/models/Rating');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { loadEnv } = require('../../src/config/env');
const mongoose = require('mongoose');

let app;
let env;

beforeAll(async () => {
  env = loadEnv();
  app = createApp();
});

function authHeaderFor(user) {
  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

test('avg and list by place, and create rating', async () => {
  const placeId = 'jester-east';
  await Rating.deleteMany({ placeId });
  const dummyAuthor = new mongoose.Types.ObjectId();
  await Rating.create({ authorId: dummyAuthor, kind: 'dorm', placeId, placeName: 'Jester East', stars: 4, pros: [], cons: [], tips: '', photos: [] });
  await Rating.create({ authorId: dummyAuthor, kind: 'dorm', placeId, placeName: 'Jester East', stars: 5, pros: [], cons: [], tips: '', photos: [] });

  const avgRes = await request(app).get(`/ratings/avg?placeId=${placeId}`).expect(200);
  expect(avgRes.body.data.avg).toBe(4.5);
  expect(avgRes.body.data.count).toBe(2);

  const listRes = await request(app).get(`/ratings/by-place?placeId=${placeId}`).expect(200);
  expect(listRes.body.data.length).toBe(2);

  const user = await User.create({ email: 'rate@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Rater' });
  const createRes = await request(app)
    .post('/ratings')
    .set('Authorization', authHeaderFor(user))
    .send({ kind: 'dorm', placeId, placeName: 'Jester East', stars: 3, pros: [], cons: [], tips: '', photos: [] })
    .expect(200);
  expect(createRes.body.data.stars).toBe(3);
}); 