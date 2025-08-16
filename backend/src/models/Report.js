const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['user', 'listing', 'rating', 'message'], required: true },
  targetId: { type: String, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['open', 'reviewed', 'actioned', 'dismissed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(reportSchema);

const blockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(blockSchema);

module.exports = { Report: mongoose.model('Report', reportSchema), Block: mongoose.model('Block', blockSchema) }; 