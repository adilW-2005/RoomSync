const { errorEnvelope } = require('../utils/response');

function notFoundHandler(_req, res, _next) {
  return res.status(404).json(errorEnvelope('Not Found', 'NOT_FOUND'));
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const code = err.code || (status === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message = err.message || 'Something went wrong';
  const details = err.details;
  return res.status(status).json(errorEnvelope(message, code, details));
}

module.exports = { notFoundHandler, errorHandler }; 