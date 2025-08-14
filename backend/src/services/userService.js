const User = require('../models/User');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');

async function updateProfile(user, { name, bio, contact, avatarBase64 }) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (contact !== undefined) updates.contact = contact;
  if (avatarBase64) {
    updates.avatarUrl = await uploadBase64ToCloudinary(avatarBase64, 'avatars');
  }
  await User.updateOne({ _id: user._id }, { $set: updates });
  const fresh = await User.findById(user._id);
  return fresh.toJSON();
}

module.exports = { updateProfile }; 