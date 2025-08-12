const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const shareSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  split: { type: String, enum: ['equal', 'custom'], required: true },
  shares: { type: [shareSchema], default: [] },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(expenseSchema);

module.exports = mongoose.model('Expense', expenseSchema); 