const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const deviceTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  platform: { type: String, enum: ['ios', 'android', 'web', 'expo'], default: 'expo' },
  token: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true },
  lastSeenAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(deviceTokenSchema);

module.exports = mongoose.model('DeviceToken', deviceTokenSchema); 