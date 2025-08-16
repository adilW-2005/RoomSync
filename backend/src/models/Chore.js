const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const choreSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  title: { type: String, required: true },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  repeat: { type: String, enum: ['none', 'daily', 'weekly', 'custom'], default: 'none' },
  customDays: [{ type: Number, min: 0, max: 6 }],
  dueAt: { type: Date, required: true },
  status: { type: String, enum: ['open', 'done'], default: 'open', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pointsPerCompletion: { type: Number, default: 10 },
  completions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date, default: Date.now },
    points: { type: Number, default: 10 },
  }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    attachments: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

choreSchema.pre('save', function setUpdated(next) {
  this.updatedAt = new Date();
  next();
});

applyBaseSchemaTransforms(choreSchema);

module.exports = mongoose.model('Chore', choreSchema); 