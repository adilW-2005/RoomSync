const mongoose = require('mongoose');

const PlaceLookupSchema = new mongoose.Schema({
	sourceType: { type: String, enum: ['building', 'place'], required: true },
	key: { type: String, required: true }, // e.g., building code like "GDC" or ut_places id like "the-castilian"
	name: { type: String, required: true },
	query: { type: String, required: true },
	placeId: { type: String },
	formattedAddress: { type: String },
	lat: { type: Number },
	lng: { type: Number },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

PlaceLookupSchema.index({ sourceType: 1, key: 1 }, { unique: true });

PlaceLookupSchema.pre('save', function(next) {
	this.updatedAt = new Date();
	next();
});

module.exports = mongoose.model('PlaceLookup', PlaceLookupSchema); 