const request = require('supertest');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
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

test('listings filter and create/update', async () => {
  const user = await User.create({ email: 'mkt@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Seller' });

  const created = await request(app)
    .post('/listings')
    .set('Authorization', authHeaderFor(user))
    .send({
      type: 'furniture',
      title: 'Chair',
      description: 'Nice chair',
      price: 25,
      photos: [],
      loc: { lat: 30.28, lng: -97.74 },
    })
    .expect(200);
  expect(created.body.data.type).toBe('furniture');

  const updated = await request(app)
    .patch(`/listings/${created.body.data.id}`)
    .set('Authorization', authHeaderFor(user))
    .send({ price: 30 })
    .expect(200);
  expect(updated.body.data.price).toBe(30);

  const list = await request(app)
    .get('/listings?type=furniture&min=20&max=40&q=chair')
    .expect(200);
  expect(Array.isArray(list.body.data)).toBe(true);
  expect(list.body.data.length).toBeGreaterThan(0);
});

test('favorite and unfavorite listing', async () => {
  const seller = await User.create({ email: 'seller@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Seller' });
  const buyer = await User.create({ email: 'buyer@ex.com', passwordHash: await bcrypt.hash('p', 10), name: 'Buyer' });

  const created = await request(app)
    .post('/listings')
    .set('Authorization', authHeaderFor(seller))
    .send({ type: 'other', title: 'Lamp', price: 10, photos: [], loc: { lat: 30.28, lng: -97.74 } })
    .expect(200);

  await request(app).post(`/listings/${created.body.data.id}/favorite`).set('Authorization', authHeaderFor(buyer)).expect(200);
  const afterFav = await User.findById(buyer._id);
  expect(afterFav.favoriteListings.map(String)).toContain(String(created.body.data.id));

  await request(app).post(`/listings/${created.body.data.id}/unfavorite`).set('Authorization', authHeaderFor(buyer)).expect(200);
  const afterUnfav = await User.findById(buyer._id);
  expect(afterUnfav.favoriteListings.map(String)).not.toContain(String(created.body.data.id));
}); 