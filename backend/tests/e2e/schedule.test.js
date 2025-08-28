const request = require('supertest');
const mongoose = require('mongoose');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
const ScheduleEvent = require('../../src/models/ScheduleEvent');
const jwt = require('jsonwebtoken');
const { loadEnv } = require('../../src/config/env');

function sign(user) {
  const env = loadEnv();
  const secret = env.JWT_SECRET || 'test';
  return jwt.sign({ sub: user._id.toString() }, secret, { expiresIn: '1h' });
}

describe('Schedule E2E', () => {
  let app; let user; let token;
  beforeAll(async () => {
    app = createApp();
  });
  beforeEach(async () => {
    user = await User.create({ email: 'sch@ut.test', passwordHash: 'x', name: 'Sch Test' });
    token = sign(user);
  });
  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('save manual schedule and get next across days', async () => {
    const events = [
      { course: 'C S 311', building: 'GDC', room: '2.216', days: ['M','W','F'], start_time: '09:00', end_time: '09:50' },
      { course: 'MATH 408C', building: 'RLM', room: '4.102', days: ['T','Th'], start_time: '11:00', end_time: '12:15' },
    ];
    const save = await request(app).post('/schedule/save').set('Authorization', `Bearer ${token}`).send({ events });
    expect(save.status).toBe(200);
    expect(save.body?.data?.events?.length).toBe(2);

    const next = await request(app).get('/schedule/next').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    // next may be null depending on test run day, but API should succeed
    expect(Object.prototype.hasOwnProperty.call(next.body, 'data')).toBe(true);
  });

  test('dedupes same section on re-import', async () => {
    const events = [
      { course: 'C S 311', building: 'GDC', room: '2.216', days: ['M','W','F'], start_time: '09:00', end_time: '09:50' },
      { course: 'C S 311', building: 'GDC', room: '2.216', days: ['M','W','F'], start_time: '09:00', end_time: '09:50' },
    ];
    const save = await request(app).post('/schedule/save').set('Authorization', `Bearer ${token}`).send({ events });
    expect(save.status).toBe(200);
    const list = await request(app).get('/schedule').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body?.data?.events?.length).toBe(1);
  });
}); 