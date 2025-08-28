const http = require('http');
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { loadEnv } = require('./config/env');

function createLogger(isProd) {
  return {
    info: (...args) => {
      // eslint-disable-next-line no-console
      if (!isProd) console.log(...args);
    },
    error: (...args) => {
      // eslint-disable-next-line no-console
      console.error(...args);
    }
  };
}

(async () => {
  const env = loadEnv();
  const log = createLogger(env.NODE_ENV === 'production');
  const app = createApp();
  const server = http.createServer(app);

  // Attach socket.io
  const { attachSocket } = require('./socket');
  attachSocket(server);

  try {
    await mongoose.connect(env.MONGO_URI, {
      autoIndex: env.NODE_ENV !== 'production'
    });
    log.info('MongoDB connected');
  } catch (err) {
    log.error('MongoDB connection error', err);
    process.exit(1);
  }

  const port = Number(env.PORT || 4000);
  server.listen(port, () => {
    log.info(`API listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    try {
      log.error(`Received ${signal}. Shutting down...`);
      await mongoose.connection.close();
      server.close(() => {
        process.exit(0);
      });
      // Fallback hard exit
      setTimeout(() => process.exit(0), 5000).unref();
    } catch (e) {
      log.error('Error during shutdown', e);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})(); 