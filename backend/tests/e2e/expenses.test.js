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

test('create equal split expense and compute balances', async () => {
  const a = await User.create({ email: 'a@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'A' });
  const b = await User.create({ email: 'b@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'B' });
  const group = await Group.create({ name: 'Group X', code: 'EX11EX', members: [a._id, b._id] });
  a.groups = [group._id];
  b.groups = [group._id];
  await a.save();
  await b.save();

  const created = await request(app)
    .post('/expenses')
    .set('Authorization', authHeaderFor(a))
    .send({ amount: 50, split: 'equal', payerId: String(a._id) })
    .expect(200);
  expect(created.body.data.amount).toBe(50);

  const balancesRes = await request(app)
    .get('/expenses/balances')
    .set('Authorization', authHeaderFor(a))
    .expect(200);
  const balances = balancesRes.body.data;
  expect(balances.find((x) => x.userId === String(a._id)).amount).toBeGreaterThan(0);
  expect(balances.find((x) => x.userId === String(b._id)).amount).toBeLessThan(0);
});

test('create custom split expense and validate shares sum', async () => {
  const a = await User.create({ email: 'c@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'C' });
  const b = await User.create({ email: 'd@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'D' });
  const group = await Group.create({ name: 'Group Y', code: 'EX22EX', members: [a._id, b._id] });
  a.groups = [group._id];
  b.groups = [group._id];
  await a.save();
  await b.save();

  const good = await request(app)
    .post('/expenses')
    .set('Authorization', authHeaderFor(a))
    .send({ amount: 30, split: 'custom', shares: [{ userId: String(a._id), amount: 10 }, { userId: String(b._id), amount: 20 }] })
    .expect(200);
  expect(good.body.data.amount).toBe(30);

  const bad = await request(app)
    .post('/expenses')
    .set('Authorization', authHeaderFor(a))
    .send({ amount: 30, split: 'custom', shares: [{ userId: String(a._id), amount: 10 }] })
    .expect(400);
  expect(bad.body.code).toBe('SHARES_MISMATCH');
}); 