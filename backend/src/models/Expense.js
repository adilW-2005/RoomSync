const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const shareSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    percent: { type: Number, min: 0, max: 100 },
    shares: { type: Number, min: 0 },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  split: { type: String, enum: ['equal', 'custom', 'unequal', 'percent', 'shares'], required: true },
  shares: { type: [shareSchema], default: [] },
  notes: { type: String },
  receiptUrl: { type: String },
  // Recurring scaffold
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['weekly', 'monthly', 'custom'] },
    dayOfMonth: { type: Number, min: 1, max: 28 },
    intervalWeeks: { type: Number, min: 1, max: 12 },
    nextRunAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(expenseSchema);

module.exports = mongoose.model('Expense', expenseSchema); 