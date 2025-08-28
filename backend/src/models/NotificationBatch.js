const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const notificationBatchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  category: { type: String, index: true },
  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },
  count: { type: Number, default: 0 },
  mergedIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(notificationBatchSchema);

module.exports = mongoose.model('NotificationBatch', notificationBatchSchema); 