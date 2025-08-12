const request = require('supertest');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
const Group = require('../../src/models/Group');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { loadEnv } = require('../../src/config/env');

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

test('beacon updates presence and presence is retrievable', async () => {
  const user = await User.create({ email: 'presence@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Presence' });
  const group = await Group.create({ name: 'Group P', code: 'PR11PR', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const lat = 30.28; const lng = -97.74;
  await request(app)
    .post('/locations/beacon')
    .set('Authorization', authHeaderFor(user))
    .send({ groupId: String(group._id), lat, lng })
    .expect(200);

  const res = await request(app)
    .get(`/locations/presence?groupId=${group._id}`)
    .set('Authorization', authHeaderFor(user))
    .expect(200);
  expect(Array.isArray(res.body.data)).toBe(true);
  const me = res.body.data.find((p) => p.userId === String(user._id));
  expect(me.lat).toBe(lat);
  expect(me.lng).toBe(lng);
}); 