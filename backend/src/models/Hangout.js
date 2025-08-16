const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  optionId: { type: String, required: true },
  at: { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const hangoutSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  options: [{ id: { type: String, required: true }, label: { type: String, required: true }, when: { type: Date } }],
  votes: [voteSchema],
  rsvps: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: { type: String, enum: ['going', 'maybe', 'not'], default: 'maybe' }, at: { type: Date, default: Date.now } }],
  messages: [messageSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(hangoutSchema);

module.exports = mongoose.model('Hangout', hangoutSchema); 