const mongoose = require('mongoose');
const Chore = require('../models/Chore');
const Group = require('../models/Group');

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

async function listChores(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const filter = { groupId };
  if (query.status) filter.status = query.status;
  const chores = await Chore.find(filter).sort({ dueAt: 1 });
  return chores.map((c) => c.toJSON());
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

  const allowed = ['title', 'assignees', 'repeat', 'customDays', 'dueAt', 'status'];
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
      });
      notifyChoreAssigned(next);
    }
  }

  return chore.toJSON();
}

function notifyChoreAssigned(_chore) {
  // Stub: enqueue push notification per assignee when due time approaches.
  return true;
}

module.exports = { listChores, createChore, updateChore, completeChore }; 