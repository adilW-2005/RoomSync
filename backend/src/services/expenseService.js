const mongoose = require('mongoose');
const Expense = require('../models/Expense');
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

async function listExpenses(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const expenses = await Expense.find({ groupId }).sort({ createdAt: -1 });
  return expenses.map((e) => e.toJSON());
}

async function getHistoryPaginated(user, { groupId: gid, page = 1, limit = 20 } = {}) {
  const groupId = gid || getCurrentGroupIdForUser(user);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Expense.find({ groupId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Expense.countDocuments({ groupId }),
  ]);
  return { items: items.map((e) => e.toJSON()), page, limit, total };
}

function normalizeSharesForSplit(split, amount, members, payloadShares) {
  const toFixed2 = (n) => Number(Number(n).toFixed(2));
  if (split === 'equal') {
    const per = toFixed2(amount / members.length);
    const remainder = toFixed2(amount - per * (members.length - 1));
    return members.map((uid, idx) => ({ userId: uid, amount: idx === members.length - 1 ? remainder : per }));
  }
  if (split === 'custom' || split === 'unequal') {
    if (!Array.isArray(payloadShares) || payloadShares.length === 0) {
      const err = new Error('Shares required for custom/unequal split');
      err.status = 400;
      err.code = 'SHARES_REQUIRED';
      throw err;
    }
    let total = 0;
    const mapped = payloadShares.map((s) => ({ userId: s.userId, amount: Number(s.amount || 0) }));
    for (const s of mapped) total += s.amount;
    total = toFixed2(total);
    if (total !== toFixed2(amount)) {
      const err = new Error('Shares must sum to amount');
      err.status = 400;
      err.code = 'SHARES_MISMATCH';
      throw err;
    }
    return mapped.map((s) => ({ userId: new mongoose.Types.ObjectId(s.userId), amount: toFixed2(s.amount) }));
  }
  if (split === 'percent') {
    if (!Array.isArray(payloadShares) || payloadShares.length === 0) {
      const err = new Error('Shares required for percent split');
      err.status = 400;
      err.code = 'SHARES_REQUIRED';
      throw err;
    }
    let totalPct = 0;
    for (const s of payloadShares) totalPct += Number(s.percent || 0);
    if (Number(totalPct.toFixed(2)) !== 100) {
      const err = new Error('Percents must total 100');
      err.status = 400;
      err.code = 'PERCENT_MISMATCH';
      throw err;
    }
    return payloadShares.map((s, idx) => {
      const amt = idx === payloadShares.length - 1 ? amount - payloadShares.slice(0, -1).reduce((acc, p) => acc + (Number(p.percent || 0) / 100) * amount, 0) : (Number(s.percent) / 100) * amount;
      return { userId: new mongoose.Types.ObjectId(s.userId), amount: toFixed2(amt) };
    });
  }
  if (split === 'shares') {
    if (!Array.isArray(payloadShares) || payloadShares.length === 0) {
      const err = new Error('Shares required for shares split');
      err.status = 400;
      err.code = 'SHARES_REQUIRED';
      throw err;
    }
    let totalShares = 0;
    for (const s of payloadShares) totalShares += Number(s.shares || 0);
    if (!(totalShares > 0)) {
      const err = new Error('Total shares must be > 0');
      err.status = 400;
      err.code = 'INVALID_SHARES_TOTAL';
      throw err;
    }
    let accumulated = 0;
    const mapped = payloadShares.map((s, idx) => {
      if (idx === payloadShares.length - 1) {
        return { userId: new mongoose.Types.ObjectId(s.userId), amount: toFixed2(amount - accumulated) };
      }
      const amt = toFixed2((Number(s.shares) / totalShares) * amount);
      accumulated += amt;
      return { userId: new mongoose.Types.ObjectId(s.userId), amount: amt };
    });
    return mapped;
  }
  const err = new Error('Invalid split type');
  err.status = 400;
  err.code = 'INVALID_SPLIT';
  throw err;
}

async function createExpense(user, payload) {
  const groupId = payload.groupId || getCurrentGroupIdForUser(user);
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  const memberSet = new Set((group.members || []).map((m) => String(m)));

  const payerId = new mongoose.Types.ObjectId(payload.payerId || user._id);
  if (!memberSet.has(String(payerId))) {
    const err = new Error('Payer must be a group member');
    err.status = 400;
    err.code = 'PAYER_NOT_IN_GROUP';
    throw err;
  }

  const amount = Number(payload.amount);
  if (!(amount > 0)) {
    const err = new Error('Amount must be > 0');
    err.status = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const members = Array.from(memberSet);
  const shares = normalizeSharesForSplit(payload.split, amount, members, payload.shares || []);

  let receiptUrl;
  if (payload.receiptBase64) {
    receiptUrl = await uploadBase64ToCloudinary(payload.receiptBase64, 'receipts');
  }

  const expense = await Expense.create({
    groupId,
    payerId,
    amount,
    split: payload.split,
    shares,
    notes: payload.notes || '',
    receiptUrl,
    recurring: payload.recurring ? {
      enabled: Boolean(payload.recurring.enabled),
      frequency: payload.recurring.frequency,
      dayOfMonth: payload.recurring.dayOfMonth,
      intervalWeeks: payload.recurring.intervalWeeks,
      nextRunAt: payload.recurring.enabled ? computeNextRunAt(payload.recurring) : undefined,
    } : undefined,
  });

  return expense.toJSON();
}

function computeNextRunAt(rec) {
  const now = new Date();
  if (rec.frequency === 'monthly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(rec.dayOfMonth || 1, 28));
    return d;
  }
  if (rec.frequency === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7 * (rec.intervalWeeks || 1));
    return d;
  }
  return undefined;
}

async function getBalances(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const expenses = await Expense.find({ groupId });

  // Net balance per userId: positive means others owe them; negative means they owe others
  const balanceMap = new Map();

  for (const exp of expenses) {
    const payer = String(exp.payerId);
    const amt = Number(exp.amount);
    balanceMap.set(payer, Number((balanceMap.get(payer) || 0) + amt));
    for (const share of exp.shares) {
      const uid = String(share.userId);
      balanceMap.set(uid, Number((balanceMap.get(uid) || 0) - Number(share.amount)));
    }
  }

  const balances = Array.from(balanceMap.entries()).map(([userId, amount]) => ({ userId, amount: Number(Number(amount).toFixed(2)) }));
  return balances;
}

async function settleUp(user, { fromUserId, toUserId, amount, groupId: gid }) {
  const groupId = gid || getCurrentGroupIdForUser(user);
  // Represent settlement as a special expense: payer=fromUser, shares=[{userId: toUser, amount}]
  const payload = {
    groupId,
    payerId: fromUserId,
    amount,
    split: 'custom',
    shares: [{ userId: toUserId, amount }],
    notes: 'Settle-up payment',
  };
  return createExpense(user, payload);
}

async function exportBalancesCsv(user, query = {}) {
  const balances = await getBalances(user, query);
  const rows = [['userId', 'amount'], ...balances.map((b) => [b.userId, b.amount])];
  return rows.map((r) => r.join(',')).join('\n');
}

module.exports = { listExpenses, createExpense, getBalances, getHistoryPaginated, settleUp, exportBalancesCsv }; 