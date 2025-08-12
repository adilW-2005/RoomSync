const http = require('http');
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { loadEnv } = require('./config/env');

(async () => {
  const env = loadEnv();
  const app = createApp();
  const server = http.createServer(app);

  // Attach socket.io
  const { attachSocket } = require('./socket');
  attachSocket(server);

  try {
    await mongoose.connect(env.MONGO_URI, { dbName: 'roomsync' });
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error', err);
    process.exit(1);
  }

  const port = env.PORT || 4000;
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${port}`);
  });
})(); 