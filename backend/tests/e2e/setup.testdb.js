const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;

// Ensure consistent JWT secret across tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test';

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('roomsync_test');
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});
