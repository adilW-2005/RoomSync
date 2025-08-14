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

  let shares = [];
  const members = Array.from(memberSet);

  if (payload.split === 'equal') {
    const per = Number((amount / members.length).toFixed(2));
    const remainder = Number((amount - per * (members.length - 1)).toFixed(2));
    shares = members.map((uid, idx) => ({ userId: uid, amount: idx === members.length - 1 ? remainder : per }));
  } else if (payload.split === 'custom') {
    if (!Array.isArray(payload.shares) || payload.shares.length === 0) {
      const err = new Error('Shares required for custom split');
      err.status = 400;
      err.code = 'SHARES_REQUIRED';
      throw err;
    }
    let total = 0;
    for (const s of payload.shares) {
      if (!memberSet.has(String(s.userId))) {
        const err = new Error('Share user must be a group member');
        err.status = 400;
        err.code = 'SHARE_USER_NOT_IN_GROUP';
        throw err;
      }
      total += Number(s.amount || 0);
    }
    total = Number(total.toFixed(2));
    if (total !== Number(amount.toFixed(2))) {
      const err = new Error('Shares must sum to amount');
      err.status = 400;
      err.code = 'SHARES_MISMATCH';
      throw err;
    }
    shares = payload.shares.map((s) => ({ userId: new mongoose.Types.ObjectId(s.userId), amount: Number(s.amount) }));
  } else {
    const err = new Error('Invalid split type');
    err.status = 400;
    err.code = 'INVALID_SPLIT';
    throw err;
  }

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
  });

  return expense.toJSON();
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

  const balances = Array.from(balanceMap.entries()).map(([userId, amount]) => ({ userId, amount: Number(amount.toFixed(2)) }));
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