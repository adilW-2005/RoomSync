const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const inventorySchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  shared: { type: Boolean, default: false },
  expiresAt: { type: Date },
  lowStockThreshold: { type: Number, default: 0 },
  categories: [{ type: String, index: true }],
  tags: [{ type: String, index: true }],
  photoUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(inventorySchema);

module.exports = mongoose.model('Inventory', inventorySchema); 