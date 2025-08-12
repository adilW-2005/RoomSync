const request = require('supertest');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
const Group = require('../../src/models/Group');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { loadEnv } = require('../../src/config/env');

let app;
let env;

beforeAll(async () => {
  env = loadEnv();
  app = createApp();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Group.deleteMany({});
});

function authHeaderFor(user) {
  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

test('create group and get current', async () => {
  const user = await User.create({
    email: 'user@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'User A',
  });

  const res = await request(app)
    .post('/groups')
    .set('Authorization', authHeaderFor(user))
    .send({ name: 'Test Group' })
    .expect(200);

  expect(res.body.data.code).toHaveLength(6);

  const me = await request(app)
    .get('/groups/current')
    .set('Authorization', authHeaderFor(user))
    .expect(200);

  expect(me.body.data.name).toBe('Test Group');
});

test('join group by code', async () => {
  const owner = await User.create({
    email: 'owner@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Owner',
  });
  const group = await Group.create({ name: 'Group X', code: 'ZZ99YY', members: [owner._id] });

  const joiner = await User.create({
    email: 'joiner@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Joiner',
  });

  const res = await request(app)
    .post('/groups/join')
    .set('Authorization', authHeaderFor(joiner))
    .send({ code: 'ZZ99YY' })
    .expect(200);

  expect(res.body.data.members.length).toBe(2);
}); 