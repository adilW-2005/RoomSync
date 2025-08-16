const User = require('../models/User');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');

async function updateProfile(user, { name, bio, contact, avatarBase64, username, showContact }) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (contact !== undefined) updates.contact = contact;
  if (typeof showContact === 'boolean') updates.showContact = showContact;
  if (username !== undefined) {
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_\.]{3,20}$/.test(normalized)) {
      const err = new Error('Invalid username');
      err.status = 400;
      err.code = 'INVALID_USERNAME';
      throw err;
    }
    const exists = await User.findOne({ username: normalized, _id: { $ne: user._id } });
    if (exists) {
      const err = new Error('Username already taken');
      err.status = 409;
      err.code = 'USERNAME_TAKEN';
      throw err;
    }
    updates.username = normalized;
  }
  if (avatarBase64) {
    updates.avatarUrl = await uploadBase64ToCloudinary(avatarBase64, 'avatars');
  }
  await User.updateOne({ _id: user._id }, { $set: updates });
  const fresh = await User.findById(user._id);
  return fresh.toJSON();
}

async function deleteAccount(user) {
  // Remove user from groups members arrays
  const Group = require('../models/Group');
  await Group.updateMany({}, { $pull: { members: user._id, memberRoles: { user: user._id } } });
  // TODO: cascade deletions for UGC if required; for now remove user document
  await User.deleteOne({ _id: user._id });
  return { success: true };
}

async function registerPushToken(user, token) {
  await User.updateOne({ _id: user._id }, { $addToSet: { pushTokens: token } });
  const fresh = await User.findById(user._id);
  return fresh.toJSON();
}

async function updateNotificationPrefs(user, prefs) {
  const allowed = ['chores', 'events', 'hangouts', 'messages'];
  const set = {};
  for (const key of allowed) {
    if (typeof prefs[key] === 'boolean') set[`notificationPrefs.${key}`] = prefs[key];
  }
  await User.updateOne({ _id: user._id }, { $set: set });
  const fresh = await User.findById(user._id);
  return fresh.toJSON();
}

module.exports = { updateProfile, deleteAccount, registerPushToken, updateNotificationPrefs }; 