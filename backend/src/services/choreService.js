const mongoose = require('mongoose');
const Chore = require('../models/Chore');
const Group = require('../models/Group');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');
const { notifyUsers } = require('./notificationService');

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

async function assertGroupAndAssigneesValid(groupId, assigneeIds = []) {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  const memberSet = new Set((group.members || []).map((m) => String(m)));
  for (const uid of assigneeIds) {
    if (!memberSet.has(String(uid))) {
      const err = new Error('Assignee is not a group member');
      err.status = 400;
      err.code = 'ASSIGNEE_NOT_IN_GROUP';
      throw err;
    }
  }
}

function nextDateForRepeat(currentDueAt, repeat, customDays = []) {
  const current = new Date(currentDueAt);
  if (repeat === 'daily') {
    current.setDate(current.getDate() + 1);
    return current;
  }
  if (repeat === 'weekly') {
    current.setDate(current.getDate() + 7);
    return current;
  }
  if (repeat === 'custom' && Array.isArray(customDays) && customDays.length > 0) {
    // Find next weekday in customDays after current date
    const currentDay = current.getDay();
    const sorted = [...new Set(customDays)].sort((a, b) => a - b);
    for (let i = 1; i <= 7; i += 1) {
      const candidate = new Date(current);
      candidate.setDate(candidate.getDate() + i);
      const wd = candidate.getDay();
      if (sorted.includes(wd)) return candidate;
    }
  }
  return null;
}

function isOverdue(chore) {
  return chore.status === 'open' && new Date(chore.dueAt).getTime() < Date.now();
}

async function listChores(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const filter = { groupId };
  if (query.status) filter.status = query.status;
  const chores = await Chore.find(filter).sort({ dueAt: 1 });
  const mapped = chores.map((c) => ({ ...c.toJSON(), overdue: isOverdue(c) }));
  return mapped;
}

async function createChore(user, payload) {
  const groupId = payload.groupId || getCurrentGroupIdForUser(user);
  const assignees = (payload.assignees || []).map((id) => new mongoose.Types.ObjectId(id));
  await assertGroupAndAssigneesValid(groupId, assignees);

  const chore = await Chore.create({
    groupId,
    title: payload.title,
    assignees,
    repeat: payload.repeat || 'none',
    customDays: payload.customDays || [],
    dueAt: new Date(payload.dueAt),
    status: 'open',
    createdBy: user._id,
    pointsPerCompletion: payload.pointsPerCompletion || 10,
  });

  notifyChoreAssigned(chore);
  return chore.toJSON();
}

async function updateChore(user, id, updates) {
  const chore = await Chore.findById(id);
  if (!chore) {
    const err = new Error('Chore not found');
    err.status = 404;
    err.code = 'CHORE_NOT_FOUND';
    throw err;
  }
  // Ensure user is a member of the chore's group
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(chore.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const allowed = ['title', 'assignees', 'repeat', 'customDays', 'dueAt', 'status', 'pointsPerCompletion'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'assignees') {
        await assertGroupAndAssigneesValid(chore.groupId, updates.assignees);
        chore.assignees = updates.assignees;
      } else if (key === 'dueAt') {
        chore.dueAt = new Date(updates.dueAt);
      } else {
        chore[key] = updates[key];
      }
    }
  }
  await chore.save();
  return chore.toJSON();
}

async function completeChore(user, id) {
  const chore = await Chore.findById(id);
  if (!chore) {
    const err = new Error('Chore not found');
    err.status = 404;
    err.code = 'CHORE_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(chore.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  chore.status = 'done';
  chore.completions = chore.completions || [];
  const points = chore.pointsPerCompletion || 10;
  chore.completions.push({ userId: user._id, completedAt: new Date(), points });
  await chore.save();

  // Create next instance if repeating
  if (chore.repeat && chore.repeat !== 'none') {
    const nextDue = nextDateForRepeat(chore.dueAt, chore.repeat, chore.customDays);
    if (nextDue) {
      const next = await Chore.create({
        groupId: chore.groupId,
        title: chore.title,
        assignees: chore.assignees,
        repeat: chore.repeat,
        customDays: chore.customDays,
        dueAt: nextDue,
        status: 'open',
        createdBy: chore.createdBy,
        pointsPerCompletion: chore.pointsPerCompletion,
      });
      notifyChoreAssigned(next);
    }
  }

  return chore.toJSON();
}

async function addComment(user, id, { text, attachmentsBase64 = [] }) {
  const chore = await Chore.findById(id);
  if (!chore) {
    const err = new Error('Chore not found');
    err.status = 404;
    err.code = 'CHORE_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(chore.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const urls = [];
  for (const b64 of attachmentsBase64) {
    const url = await uploadBase64ToCloudinary(b64, 'chore_attachments');
    urls.push(url);
  }
  chore.comments = chore.comments || [];
  chore.comments.push({ userId: user._id, text: text || '', attachments: urls, createdAt: new Date() });
  await chore.save();
  return chore.toJSON();
}

async function getLeaderboard(user, { groupId }) {
  const gid = groupId || getCurrentGroupIdForUser(user);
  const chores = await Chore.find({ groupId: gid }, { completions: 1 });
  const pointsByUser = new Map();
  for (const c of chores) {
    for (const comp of (c.completions || [])) {
      const key = String(comp.userId);
      pointsByUser.set(key, (pointsByUser.get(key) || 0) + (comp.points || 0));
    }
  }
  const entries = Array.from(pointsByUser.entries()).map(([userId, points]) => ({ userId, points }));
  entries.sort((a, b) => b.points - a.points);
  return entries;
}

async function getStreaks(user, { groupId } = {}) {
  const gid = groupId || getCurrentGroupIdForUser(user);
  const chores = await Chore.find({ groupId: gid, completions: { $elemMatch: { userId: user._id } } }, { completions: 1 });
  const days = new Set();
  for (const c of chores) {
    for (const comp of (c.completions || [])) {
      if (String(comp.userId) === String(user._id)) {
        const d = new Date(comp.completedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        days.add(key);
      }
    }
  }
  const toKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  // current streak
  let current = 0;
  let cursor = new Date();
  while (days.has(toKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  // longest streak - iterate through sorted days
  const sortedKeys = Array.from(days.values()).sort((a, b) => new Date(a) - new Date(b));
  let longest = 0;
  let streak = 0;
  let prevDate = null;
  for (const key of sortedKeys) {
    const d = new Date(key);
    if (!prevDate) {
      streak = 1;
    } else {
      const diff = (d - prevDate) / (24 * 60 * 60 * 1000);
      if (diff === 1) streak += 1; else streak = 1;
    }
    if (streak > longest) longest = streak;
    prevDate = d;
  }
  return { current, longest };
}

async function notifyChoreAssigned(chore) {
  try {
    const assignees = (chore.assignees || []).map((id) => String(id));
    if (assignees.length > 0) {
      await notifyUsers(assignees, 'chores', 'New chore assigned', chore.title || '');
    }
  } catch (_) { /* noop */ }
}

module.exports = { listChores, createChore, updateChore, completeChore, addComment, getLeaderboard, getStreaks }; 