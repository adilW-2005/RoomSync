const request = require('supertest');
const { createApp } = require('../../src/app');

let app;

beforeAll(async () => {
  app = createApp();
});

test('register then login', async () => {
  const email = 'test1@example.com';
  const password = 'testpassword';
  const name = 'Test User';

  const reg = await request(app).post('/auth/register').send({ email, password, name }).expect(200);
  expect(reg.body.data.access_token).toBeTruthy();
  expect(reg.body.data.user.email).toBe(email);

  const login = await request(app).post('/auth/login').send({ email, password }).expect(200);
  expect(login.body.data.access_token).toBeTruthy();
  expect(login.body.data.user.email).toBe(email);
}); 