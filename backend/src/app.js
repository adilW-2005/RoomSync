const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xssClean = require('xss-clean');
const { router: apiRouter } = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error');
const { successResponder } = require('./utils/response');
const { loadEnv } = require('./config/env');

function createApp() {
  const app = express();
  const env = loadEnv();

  // Security headers
  app.use(helmet());

  // Trust proxy for accurate protocol/ip when behind load balancers
  if (env.TRUST_PROXY === 'true') {
    app.enable('trust proxy');
  }

  // Optional HTTPS enforcement (useful behind proxies)
  if (env.ENFORCE_HTTPS === 'true' && env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      if (proto !== 'https') {
        const host = req.headers.host;
        const url = `https://${host}${req.originalUrl}`;
        return res.redirect(301, url);
      }
      next();
    });
  }

  // CORS configuration
  const allowedOrigins = (env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: false,
      maxAge: 600,
    })
  );

  // Logging
  const morganFormat = env.NODE_ENV === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(bodyParser.json({ limit: '2mb' }));

  // Sanitize and harden
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(xssClean());

  // Unified success responder
  app.use(successResponder);

  // Basic rate limiting (apply globally)
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const max = Number(env.RATE_LIMIT_MAX || 300);
  app.use(
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      // Use request IP when not behind proxy; if behind proxy, user sets TRUST_PROXY=true
      validate: {
        trustProxy: env.TRUST_PROXY === 'true',
      },
    })
  );

  // API routes
  app.use('/', apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  // Start background scheduler for notification delivery (skip during tests)
  const { startScheduler } = require('./services/notificationDelivery');
  if (env.NODE_ENV !== 'test') {
    startScheduler();
  }

  return app;
}

module.exports = { createApp }; 