const { errorEnvelope } = require('../utils/response');

function notFoundHandler(_req, res, _next) {
  return res.status(404).json(errorEnvelope('Not Found', 'NOT_FOUND'));
}

function redactError(err, isProd) {
  const status = err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message = err.message || 'Something went wrong';
  let details = err.details;
  if (isProd && status >= 500) {
    details = undefined;
  }
  return { status, code, message, details };
}

function errorHandler(err, req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';
  const { status, code, message, details } = redactError(err, isProd);
  return res.status(status).json(errorEnvelope(message, code, details));
}

module.exports = { notFoundHandler, errorHandler }; 