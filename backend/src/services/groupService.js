const Group = require('../models/Group');
const User = require('../models/User');

function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createGroup(user, name) {
  let code = generateGroupCode();
  let attempts = 0;
  // Ensure unique code
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await Group.findOne({ code });
    if (!exists) break;
    code = generateGroupCode();
    attempts += 1;
    if (attempts > 10) throw new Error('Could not generate unique group code');
  }
  const group = await Group.create({ name, code, members: [user._id] });
  await User.updateOne({ _id: user._id }, { $addToSet: { groups: group._id } });
  return group.toJSON();
}

async function joinGroupByCode(user, code) {
  const group = await Group.findOne({ code: code.toUpperCase() });
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  const already = (user.groups || []).map(String).includes(String(group._id));
  if (!already) {
    await Group.updateOne({ _id: group._id }, { $addToSet: { members: user._id } });
    await User.updateOne({ _id: user._id }, { $addToSet: { groups: group._id } });
  }
  const fresh = await Group.findById(group._id).populate('members');
  return fresh.toJSON();
}

async function getCurrentGroup(user) {
  const groupId = (user.groups || [])[0];
  if (!groupId) return null;
  const group = await Group.findById(groupId).populate('members');
  return group ? group.toJSON() : null;
}

async function updateCurrentGroup(user, updates) {
  const groupId = (user.groups || [])[0];
  if (!groupId) {
    const err = new Error('User not in a group');
    err.status = 400;
    err.code = 'NO_GROUP';
    throw err;
  }
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  if (updates.name !== undefined) group.name = updates.name;
  await group.save();
  const fresh = await Group.findById(groupId).populate('members');
  return fresh.toJSON();
}

async function regenerateCurrentGroupCode(user) {
  const groupId = (user.groups || [])[0];
  if (!groupId) {
    const err = new Error('User not in a group');
    err.status = 400;
    err.code = 'NO_GROUP';
    throw err;
  }
  let code = generateGroupCode();
  let attempts = 0;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await Group.findOne({ code });
    if (!exists) break;
    code = generateGroupCode();
    attempts += 1;
    if (attempts > 10) throw new Error('Could not generate unique group code');
  }
  await Group.updateOne({ _id: groupId }, { $set: { code } });
  const fresh = await Group.findById(groupId).populate('members');
  return fresh.toJSON();
}

async function removeMemberFromCurrentGroup(user, userId) {
  const groupId = (user.groups || [])[0];
  if (!groupId) {
    const err = new Error('User not in a group');
    err.status = 400;
    err.code = 'NO_GROUP';
    throw err;
  }
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  await Group.updateOne({ _id: groupId }, { $pull: { members: userId } });
  await User.updateOne({ _id: userId }, { $pull: { groups: groupId } });
  const fresh = await Group.findById(groupId).populate('members');
  return fresh.toJSON();
}

module.exports = { createGroup, joinGroupByCode, getCurrentGroup, updateCurrentGroup, regenerateCurrentGroupCode, removeMemberFromCurrentGroup }; 