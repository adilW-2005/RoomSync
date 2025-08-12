const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  school: { type: String, default: 'UT Austin' },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  avatarUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(userSchema);

module.exports = mongoose.model('User', userSchema); 