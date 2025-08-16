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

async function authAgent() {
  const email = `test${Date.now()}@utexas.edu`;
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'test1234', name: 'Tester' });
  const token = res.body.data.access_token;
  const header = { Authorization: `Bearer ${token}` };
  const agent = {
    get: (url) => request(app).get(url).set(header),
    post: (url) => request(app).post(url).set(header),
    patch: (url) => request(app).patch(url).set(header),
    delete: (url) => request(app).delete(url).set(header),
  };
  return { agent, token };
}

describe('Group settings', () => {
  test('rename group and regenerate code, remove member', async () => {
    const { agent } = await authAgent();

    // create group
    const createRes = await agent.post('/groups').send({ name: 'Group One' });
    expect(createRes.status).toBe(200);
    const originalCode = createRes.body.data.code;

    // rename
    const renameRes = await agent.patch('/groups/current').send({ name: 'New Name' });
    expect(renameRes.status).toBe(200);
    expect(renameRes.body.data.name).toBe('New Name');

    // regenerate code
    const regenRes = await agent.post('/groups/current/regenerate-code').send();
    expect(regenRes.status).toBe(200);
    expect(regenRes.body.data.code).not.toBe(originalCode);

    // add a second user and join
    const email2 = `test2${Date.now()}@utexas.edu`;
    const res2 = await request(app).post('/auth/register').send({ email: email2, password: 'test1234', name: 'Peer' });
    const token2 = res2.body.data.access_token;
    const header2 = { Authorization: `Bearer ${token2}` };
    const agent2 = {
      post: (url) => request(app).post(url).set(header2),
      get: (url) => request(app).get(url).set(header2),
    };
    const currentGroup = await agent.get('/groups/current');
    const code = currentGroup.body.data.code;
    await agent2.post('/groups/join').send({ code });

    const fresh = await agent.get('/groups/current');
    const peer = fresh.body.data.members.find((m) => m.email === email2);

    // remove peer
    const rm = await agent.post('/groups/current/remove-member').send({ userId: peer.id });
    expect(rm.status).toBe(200);
    const after = await agent.get('/groups/current');
    expect(after.body.data.members.find((m) => m.email === email2)).toBeFalsy();
  });
});

describe('Group v3', () => {
  test('list my groups and switch current', async () => {
    const { agent } = await authAgent();
    const g1 = await agent.post('/groups').send({ name: 'A' });
    const g2 = await agent.post('/groups').send({ name: 'B' });
    expect(g1.status).toBe(200);
    expect(g2.status).toBe(200);

    const list = await agent.get('/groups');
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(2);

    const target = list.body.data.find((g) => g.name === 'A');
    const sw = await agent.post('/groups/switch').send({ groupId: target.id });
    expect(sw.status).toBe(200);
    expect(sw.body.data.name).toBe('A');
  });

  test('create/list/revoke invites and join via invite', async () => {
    const { agent } = await authAgent();
    await agent.post('/groups').send({ name: 'GroupInv' });

    const createInvite = await agent.post('/groups/current/invites').send({ expiresInHours: 1 });
    expect(createInvite.status).toBe(200);
    expect(createInvite.body.data.code).toHaveLength(8);
    expect(createInvite.body.data.link).toBeTruthy();

    const invites = await agent.get('/groups/current/invites');
    expect(invites.status).toBe(200);
    expect(invites.body.data.length).toBeGreaterThanOrEqual(1);

    const code = createInvite.body.data.code;

    const res2 = await request(app).post('/auth/register').send({ email: `inv${Date.now()}@utexas.edu`, password: 'test1234', name: 'Invited' });
    const token2 = res2.body.data.access_token;
    const header2 = { Authorization: `Bearer ${token2}` };
    const agent2 = {
      post: (url) => request(app).post(url).set(header2),
      get: (url) => request(app).get(url).set(header2),
    };
    const join = await agent2.post('/groups/join/invite').send({ inviteCode: code });
    expect(join.status).toBe(200);
    expect(join.body.data.members.length).toBe(2);

    const revoke = await agent.post('/groups/current/invites/revoke').send({ code });
    expect(revoke.status).toBe(200);
  });
}); 