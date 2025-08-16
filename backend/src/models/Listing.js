const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const locSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['sublet', 'furniture', 'other'], required: true, index: true },
  categories: [{ type: String, index: true }],
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0, index: true },
  photos: [{ type: String }],
  loc: { type: locSchema, required: true },
  availableFrom: { type: Date },
  availableTo: { type: Date },
  status: { type: String, enum: ['available', 'pending', 'sold'], default: 'available', index: true },
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(listingSchema);

module.exports = mongoose.model('Listing', listingSchema); 