const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Group = require('../models/Group');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');

function getCurrentGroupIdForUser(user) {
  const groupId = (user.groups || [])[0];
  if (!groupId) {
    const err = new Error('User not in a group');
    err.status = 400;
    err.code = 'NO_GROUP';
    throw err;
  }
  return String(groupId);
}

async function listInventory(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const filter = { groupId };
  if (query.q) filter.name = { $regex: query.q, $options: 'i' };
  const items = await Inventory.find(filter).sort({ createdAt: -1 });
  return items.map((i) => i.toJSON());
}

async function createInventory(user, payload) {
  const groupId = payload.groupId || getCurrentGroupIdForUser(user);
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  const ownerId = new mongoose.Types.ObjectId(payload.ownerId || user._id);
  const memberSet = new Set((group.members || []).map((m) => String(m)));
  if (!memberSet.has(String(ownerId))) {
    const err = new Error('Owner must be a group member');
    err.status = 400;
    err.code = 'OWNER_NOT_IN_GROUP';
    throw err;
  }
  let photoUrl;
  if (payload.photoBase64) {
    photoUrl = await uploadBase64ToCloudinary(payload.photoBase64, 'inventory');
  }
  const item = await Inventory.create({
    groupId,
    ownerId,
    name: payload.name,
    qty: Number(payload.qty),
    shared: Boolean(payload.shared),
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
    photoUrl,
  });
  return item.toJSON();
}

async function updateInventory(user, id, updates) {
  const item = await Inventory.findById(id);
  if (!item) {
    const err = new Error('Item not found');
    err.status = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(item.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const allowed = ['name', 'qty', 'shared', 'expiresAt'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'qty') item.qty = Number(updates.qty);
      else if (key === 'expiresAt') item.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : undefined;
      else item[key] = updates[key];
    }
  }
  if (updates.photoBase64) {
    item.photoUrl = await uploadBase64ToCloudinary(updates.photoBase64, 'inventory');
  }
  await item.save();
  return item.toJSON();
}

async function deleteInventory(user, id) {
  const item = await Inventory.findById(id);
  if (!item) {
    const err = new Error('Item not found');
    err.status = 404;
    err.code = 'ITEM_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(item.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  await Inventory.deleteOne({ _id: id });
  return { id };
}

module.exports = { listInventory, createInventory, updateInventory, deleteInventory }; 