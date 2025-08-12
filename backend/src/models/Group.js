const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(groupSchema);

module.exports = mongoose.model('Group', groupSchema); 