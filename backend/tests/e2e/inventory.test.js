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

test('create inventory and list it', async () => {
  const user = await User.create({ email: 'inv@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Inv' });
  const group = await Group.create({ name: 'Group I', code: 'IN11IN', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const created = await request(app)
    .post('/inventory')
    .set('Authorization', authHeaderFor(user))
    .send({ name: 'Detergent', qty: 2, shared: true })
    .expect(200);
  expect(created.body.data.name).toBe('Detergent');

  const list = await request(app)
    .get('/inventory')
    .set('Authorization', authHeaderFor(user))
    .expect(200);
  expect(list.body.data.length).toBe(1);
});

test('update inventory quantity', async () => {
  const user = await User.create({ email: 'inv2@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Inv2' });
  const group = await Group.create({ name: 'Group I2', code: 'IN22IN', members: [user._id] });
  user.groups = [group._id];
  await user.save();

  const created = await request(app)
    .post('/inventory')
    .set('Authorization', authHeaderFor(user))
    .send({ name: 'Soap', qty: 1, shared: false })
    .expect(200);

  const updated = await request(app)
    .patch(`/inventory/${created.body.data.id}`)
    .set('Authorization', authHeaderFor(user))
    .send({ qty: 3 })
    .expect(200);
  expect(updated.body.data.qty).toBe(3);
}); 