const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const quietHoursSchema = new mongoose.Schema({
  start: { type: String }, // HH:mm
  end: { type: String },   // HH:mm
  tz: { type: String },
}, { _id: false });

const userNotificationPrefsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, index: true, required: true },
  categories: {
    type: Object, // { chores: true, events: true, expenses: true, chat: true, marketplace: true, system: true }
    default: { chores: true, events: true, expenses: true, chat: true, marketplace: true, system: true },
  },
  channels: {
    type: Object, // { push: true, inapp: true, email: false, sms: false }
    default: { push: true, inapp: true, email: false, sms: false },
  },
  quietHours: { type: quietHoursSchema, default: { start: null, end: null, tz: 'UTC' } },
  digest: { type: String, enum: ['daily', 'weekly', 'off'], default: 'off' },
  updatedAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(userNotificationPrefsSchema);

module.exports = mongoose.model('UserNotificationPrefs', userNotificationPrefsSchema); 