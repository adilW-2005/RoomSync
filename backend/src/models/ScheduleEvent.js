const mongoose = require('mongoose');

const ScheduleEventSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
	course: { type: String, required: true },
	title: { type: String },
	building: { type: String, required: true },
	room: { type: String },
	days: { type: [String], required: true }, // ["M","W","F"]
	start_time: { type: String, required: true }, // 24h HH:mm
	end_time: { type: String, required: true },   // 24h HH:mm
	location: {
		lat: Number,
		lng: Number,
	},
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

// Include course and days in index to reduce duplicate re-imports of same section
ScheduleEventSchema.index({ userId: 1, course: 1, building: 1, room: 1, start_time: 1, end_time: 1, days: 1 });

ScheduleEventSchema.pre('save', function(next) {
	this.updatedAt = new Date();
	next();
});

module.exports = mongoose.model('ScheduleEvent', ScheduleEventSchema); 