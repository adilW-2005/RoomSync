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

test('create an event and list events', async () => {
  const user = await User.create({
    email: 'eventuser@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Event User',
  });
  const group = await Group.create({ name: 'Group E', code: 'EE33EE', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const created = await request(app)
    .post('/events')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Study Session', startAt, endAt, locationText: 'PCL', attendees: [String(user._id)] })
    .expect(200);
  expect(created.body.data.title).toBe('Study Session');

  const list = await request(app)
    .get('/events')
    .set('Authorization', authHeaderFor(user))
    .expect(200);
  expect(list.body.data.length).toBe(1);
});

test('update an event and validate attendees must be group members', async () => {
  const user = await User.create({
    email: 'eventuser2@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Event User2',
  });
  const group = await Group.create({ name: 'Group E2', code: 'EE44EE', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const endAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
  const created = await request(app)
    .post('/events')
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Group Meeting', startAt, endAt, locationText: 'Union', attendees: [String(user._id)] })
    .expect(200);

  const updated = await request(app)
    .patch(`/events/${created.body.data.id}`)
    .set('Authorization', authHeaderFor(user))
    .send({ title: 'Updated Group Meeting' })
    .expect(200);
  expect(updated.body.data.title).toBe('Updated Group Meeting');

  // Non-member attendee should fail
  const nonMemberId = '64b64b64b64b64b64b64b64b';
  const invalid = await request(app)
    .patch(`/events/${created.body.data.id}`)
    .set('Authorization', authHeaderFor(user))
    .send({ attendees: [nonMemberId] })
    .expect(400);
  expect(invalid.body.code).toBe('ATTENDEE_NOT_IN_GROUP');
}); 