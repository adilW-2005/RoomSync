const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const eventSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  title: { type: String, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  locationText: { type: String },
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(eventSchema);

module.exports = mongoose.model('Event', eventSchema); 