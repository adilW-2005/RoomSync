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

module.exports = { createGroup, joinGroupByCode, getCurrentGroup }; 