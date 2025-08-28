const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, required: true },
  category: { type: String, index: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  deeplink: { type: String },
  channels: [{ type: String, enum: ['push', 'inapp', 'email', 'sms'] }],
  status: { type: String, enum: ['queued', 'scheduled', 'sent', 'failed', 'read'], default: 'queued', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  scheduledFor: { type: Date, index: true },
  sentAt: { type: Date },
  readAt: { type: Date },
  providerId: { type: String },
  idempotencyKey: { type: String, index: true },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(notificationSchema);

module.exports = mongoose.model('Notification', notificationSchema); 