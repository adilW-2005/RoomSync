const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { router } = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error');
const { successEnvelope } = require('./utils/response');
const { loadEnv } = require('./config/env');

function createApp() {
  const app = express();
  const env = loadEnv();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: [
      'http://localhost:19006',
      'http://localhost:19000',
      'http://localhost:3000',
      'exp://127.0.0.1:19000',
      'exp://localhost:19000',
      '*'
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '2mb' }));

  // Attach helper to send success responses in envelope
  app.use((req, res, next) => {
    res.success = (data, message, code) => {
      return res.json(successEnvelope(data, message, code));
    };
    next();
  });

  // Rate limit auth endpoints
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
  app.use('/auth', authLimiter);

  // Routes
  app.use('/', router);

  // 404 and error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp }; 