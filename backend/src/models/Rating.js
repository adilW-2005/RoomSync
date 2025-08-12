const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const ratingSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['apartment', 'dorm'], required: true },
  placeId: { type: String, required: true, index: true },
  placeName: { type: String, required: true },
  stars: { type: Number, min: 1, max: 5, required: true },
  pros: [{ type: String }],
  cons: [{ type: String }],
  tips: { type: String, default: '' },
  photos: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

applyBaseSchemaTransforms(ratingSchema);

module.exports = mongoose.model('Rating', ratingSchema); 