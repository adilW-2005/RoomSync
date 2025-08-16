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
  if (query.category) filter.categories = { $in: [query.category] };
  if (query.tag) filter.tags = { $in: [query.tag] };
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
    lowStockThreshold: Number(payload.lowStockThreshold || 0),
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    tags: Array.isArray(payload.tags) ? payload.tags : [],
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
  const allowed = ['name', 'qty', 'shared', 'expiresAt', 'lowStockThreshold', 'categories', 'tags'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'qty') item.qty = Number(updates.qty);
      else if (key === 'expiresAt') item.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : undefined;
      else if (key === 'categories') item.categories = Array.isArray(updates.categories) ? updates.categories : [];
      else if (key === 'tags') item.tags = Array.isArray(updates.tags) ? updates.tags : [];
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

async function getAlerts(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const now = new Date();
  const items = await Inventory.find({ groupId });
  const low = items.filter((i) => Number(i.qty) <= Number(i.lowStockThreshold || 0));
  const expiring = items.filter((i) => i.expiresAt && new Date(i.expiresAt).getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000);
  return { low: low.map((i) => i.toJSON()), expiring: expiring.map((i) => i.toJSON()) };
}

async function exportShoppingList(user, { groupId, format = 'text' } = {}) {
  const alerts = await getAlerts(user, { groupId });
  if (format === 'csv') {
    const rows = [['name', 'qty', 'expiresAt'], ...alerts.low.map((i) => [i.name, i.qty, i.expiresAt || '']), ...alerts.expiring.map((i) => [i.name, i.qty, i.expiresAt || ''])];
    return rows.map((r) => r.join(',')).join('\n');
  }
  // text
  const lines = [];
  if (alerts.low.length) {
    lines.push('Low stock:');
    for (const i of alerts.low) lines.push(`- ${i.name} (qty ${i.qty})`);
  }
  if (alerts.expiring.length) {
    if (lines.length) lines.push('');
    lines.push('Expiring soon:');
    for (const i of alerts.expiring) lines.push(`- ${i.name} (${i.expiresAt ? new Date(i.expiresAt).toDateString() : ''})`);
  }
  return lines.join('\n');
}

module.exports = { listInventory, createInventory, updateInventory, deleteInventory, getAlerts, exportShoppingList }; 