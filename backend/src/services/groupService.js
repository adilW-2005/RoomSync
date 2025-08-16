const Group = require('../models/Group');
const User = require('../models/User');
const { loadEnv } = require('../config/env');

function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function ensureRole(group, userId, allowedRoles) {
  const entry = (group.memberRoles || []).find((mr) => String(mr.user) === String(userId));
  const role = entry ? entry.role : 'member';
  if (!allowedRoles.includes(role)) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
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
  const group = await Group.create({ name, code, members: [user._id], memberRoles: [{ user: user._id, role: 'owner' }] });
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
    await Group.updateOne({ _id: group._id }, { $addToSet: { members: user._id, memberRoles: { user: user._id, role: 'member' } } });
    await User.updateOne({ _id: user._id }, { $addToSet: { groups: group._id } });
  }
  const fresh = await Group.findById(group._id).populate('members');
  return fresh.toJSON();
}

async function joinGroupByInvite(user, inviteCode) {
  const group = await Group.findOne({ 'invites.code': inviteCode });
  if (!group) {
    const err = new Error('Invite not found');
    err.status = 404;
    err.code = 'INVITE_NOT_FOUND';
    throw err;
  }
  const invite = group.invites.find((i) => i.code === inviteCode);
  if (invite.revokedAt) {
    const err = new Error('Invite revoked');
    err.status = 400;
    err.code = 'INVITE_REVOKED';
    throw err;
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    const err = new Error('Invite expired');
    err.status = 400;
    err.code = 'INVITE_EXPIRED';
    throw err;
  }
  const already = (user.groups || []).map(String).includes(String(group._id));
  if (!already) {
    await Group.updateOne({ _id: group._id }, { $addToSet: { members: user._id, memberRoles: { user: user._id, role: 'member' } } });
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

async function getMyGroups(user) {
  const groups = await Group.find({ _id: { $in: user.groups || [] } }).populate('members');
  return groups.map((g) => g.toJSON());
}

async function switchCurrentGroup(user, groupId) {
  if (!groupId) {
    const err = new Error('Group id required');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const belongs = (user.groups || []).map(String).includes(String(groupId));
  if (!belongs) {
    const err = new Error('Not a member of group');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  // Keep user's groups array but move selected to the front as current
  const reordered = [groupId, ...((user.groups || []).filter((g) => String(g) !== String(groupId)))];
  await User.updateOne({ _id: user._id }, { $set: { groups: reordered } });
  const fresh = await Group.findById(groupId).populate('members');
  return fresh ? fresh.toJSON() : null;
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
  ensureRole(group, user._id, ['owner', 'admin']);
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
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  ensureRole(group, user._id, ['owner', 'admin']);
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
  ensureRole(group, user._id, ['owner', 'admin']);
  await Group.updateOne({ _id: groupId }, { $pull: { members: userId, memberRoles: { user: userId } } });
  await User.updateOne({ _id: userId }, { $pull: { groups: groupId } });
  const fresh = await Group.findById(groupId).populate('members');
  return fresh.toJSON();
}

async function createInvite(user, { expiresInHours } = {}) {
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
  ensureRole(group, user._id, ['owner', 'admin']);
  const code = generateInviteCode();
  const invite = { code, createdBy: user._id, createdAt: new Date() };
  if (expiresInHours) {
    invite.expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  }
  await Group.updateOne({ _id: groupId }, { $push: { invites: invite } });
  const { APP_SCHEME, DEEP_LINK_HOST } = loadEnv();
  const link = `${APP_SCHEME}://invite?code=${code}`;
  const universal = `https://${DEEP_LINK_HOST}/invite/${code}`;
  return { groupId: String(groupId), code, link, universal, expiresAt: invite.expiresAt || null };
}

async function listInvites(user) {
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
  ensureRole(group, user._id, ['owner', 'admin']);
  return (group.invites || []).map((i) => ({ code: i.code, createdAt: i.createdAt, expiresAt: i.expiresAt || null, revokedAt: i.revokedAt || null }));
}

async function revokeInvite(user, code) {
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
  ensureRole(group, user._id, ['owner', 'admin']);
  await Group.updateOne({ _id: groupId, 'invites.code': code }, { $set: { 'invites.$.revokedAt': new Date() } });
  return { code, revokedAt: new Date() };
}

module.exports = { createGroup, joinGroupByCode, joinGroupByInvite, getCurrentGroup, getMyGroups, switchCurrentGroup, updateCurrentGroup, regenerateCurrentGroupCode, removeMemberFromCurrentGroup, createInvite, listInvites, revokeInvite }; 