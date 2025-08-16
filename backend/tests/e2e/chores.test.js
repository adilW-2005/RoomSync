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

test('add comments with attachment and see in chore', async () => {
  const user = await User.create({
    email: 'commenter@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Commenter',
  });
  const group = await Group.create({ name: 'Group K', code: 'KK33KK', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const dueAt = new Date(Date.now() + 60 * 60 * 1000);
  const created = await request(app)
    .post('/chores')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Wipe counters', dueAt, assignees: [String(user._id)], repeat: 'none' })
    .expect(200);

  const b64 = 'data:image/png;base64,iVBORw0KGgo='; // minimal stub
  const commented = await request(app)
    .post(`/chores/${created.body.data.id}/comments`)
    .set('Authorization', authHeaderFor(user))
    .send({ text: 'Done with pic', attachmentsBase64: [b64] })
    .expect(200);
  expect(commented.body.data.comments.length).toBe(1);
});

test('leaderboard aggregates points by user', async () => {
  const user = await User.create({
    email: 'leader@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Leader',
  });
  const user2 = await User.create({
    email: 'leader2@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Leader2',
  });
  const group = await Group.create({ name: 'Group L', code: 'LL44LL', members: [user._id, user2._id] });
  user.groups = [group._id];
  user2.groups = [group._id];
  await user.save();
  await user2.save();

  const dueAt = new Date(Date.now() + 60 * 60 * 1000);
  const c1 = await request(app)
    .post('/chores')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Sweep', dueAt, assignees: [String(user._id)], repeat: 'none', pointsPerCompletion: 5 })
    .expect(200);
  await request(app).post(`/chores/${c1.body.data.id}/complete`).set('Authorization', authHeaderFor(user)).expect(200);

  const c2 = await request(app)
    .post('/chores')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Mop', dueAt, assignees: [String(user2._id)], repeat: 'none', pointsPerCompletion: 8 })
    .expect(200);
  await request(app).post(`/chores/${c2.body.data.id}/complete`).set('Authorization', authHeaderFor(user2)).expect(200);

  const lb = await request(app).get('/chores/leaderboard').set('Authorization', authHeaderFor(user)).expect(200);
  expect(Array.isArray(lb.body.data)).toBe(true);
  expect(lb.body.data[0].points).toBeGreaterThanOrEqual(lb.body.data[1].points);
}); 