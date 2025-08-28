const mongoose = require('mongoose');
const { applyBaseSchemaTransforms } = require('../utils/mongooseUtils');

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  unreadCount: { type: Number, default: 0 },
  lastReadAt: { type: Date },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  type: { type: String, enum: ['dm', 'listing'], required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', index: true },
  participants: { type: [participantSchema], validate: v => Array.isArray(v) && v.length === 2 },
  lastMessage: {
    text: { type: String, default: '' },
    photos: [{ type: String }],
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationSchema.index({ type: 1, listingId: 1, 'participants.userId': 1 });

conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

applyBaseSchemaTransforms(conversationSchema);

module.exports = mongoose.model('Conversation', conversationSchema); 