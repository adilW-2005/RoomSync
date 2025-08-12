function successEnvelope(data, message, code) {
  const payload = { data };
  if (message) payload.message = message;
  if (code) payload.code = code;
  return payload;
}

function errorEnvelope(message, code, details) {
  const payload = { message, code };
  if (details !== undefined) payload.details = details;
  return payload;
}

module.exports = { successEnvelope, errorEnvelope }; 