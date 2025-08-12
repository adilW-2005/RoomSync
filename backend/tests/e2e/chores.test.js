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

test('create chore and list open chores', async () => {
  const user = await User.create({
    email: 'choreuser@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Chore User',
  });
  const group = await Group.create({ name: 'Group C', code: 'CC11CC', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const created = await request(app)
    .post('/chores')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Vacuum living room', dueAt, assignees: [String(user._id)], repeat: 'none' })
    .expect(200);
  expect(created.body.data.title).toBe('Vacuum living room');

  const list = await request(app)
    .get('/chores?status=open')
    .set('Authorization', authHeaderFor(user))
    .expect(200);
  expect(Array.isArray(list.body.data)).toBe(true);
  expect(list.body.data.length).toBe(1);
});

test('complete a weekly chore creates next occurrence', async () => {
  const user = await User.create({
    email: 'repeatuser@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Repeat User',
  });
  const group = await Group.create({ name: 'Group R', code: 'RR22RR', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const dueAt = new Date(Date.now() + 60 * 60 * 1000);
  const created = await request(app)
    .post('/chores')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Wash dishes', dueAt, assignees: [String(user._id)], repeat: 'weekly' })
    .expect(200);

  const completed = await request(app)
    .post(`/chores/${created.body.data.id}/complete`)
    .set('Authorization', authHeaderFor(user))
    .expect(200);
  expect(completed.body.data.status).toBe('done');

  const list = await request(app)
    .get('/chores?status=open')
    .set('Authorization', authHeaderFor(user))
    .expect(200);
  expect(list.body.data.length).toBe(1);
  const next = list.body.data[0];
  expect(next.title).toBe('Wash dishes');
}); 