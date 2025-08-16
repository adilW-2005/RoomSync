const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, index: true },
  school: { type: String, default: 'UT Austin' },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  avatarUrl: { type: String },
  bio: { type: String },
  contact: { type: String },
  showContact: { type: Boolean, default: false },
  favoriteListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
  pushTokens: [{ type: String }],
  notificationPrefs: {
    chores: { type: Boolean, default: true },
    events: { type: Boolean, default: true },
    hangouts: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
  },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(userSchema);

module.exports = mongoose.model('User', userSchema); 