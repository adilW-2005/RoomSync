const mongoose = require('mongoose');
const Event = require('../models/Event');
const Group = require('../models/Group');
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

async function assertGroupAndAttendeesValid(groupId, attendeeIds = []) {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  const memberSet = new Set((group.members || []).map((m) => String(m)));
  for (const uid of attendeeIds) {
    if (!memberSet.has(String(uid))) {
      const err = new Error('Attendee is not a group member');
      err.status = 400;
      err.code = 'ATTENDEE_NOT_IN_GROUP';
      throw err;
    }
  }
}

async function listEvents(user, query = {}) {
  const groupId = query.groupId || getCurrentGroupIdForUser(user);
  const events = await Event.find({ groupId }).sort({ startAt: 1 });
  return events.map((e) => e.toJSON());
}

async function createEvent(user, payload) {
  const groupId = payload.groupId || getCurrentGroupIdForUser(user);
  const attendees = (payload.attendees || []).map((id) => new mongoose.Types.ObjectId(id));
  await assertGroupAndAttendeesValid(groupId, attendees);

  const startAt = new Date(payload.startAt);
  const endAt = new Date(payload.endAt);
  if (!(startAt < endAt)) {
    const err = new Error('startAt must be before endAt');
    err.status = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  const event = await Event.create({
    groupId,
    title: payload.title,
    startAt,
    endAt,
    locationText: payload.locationText || '',
    lat: payload.lat,
    lng: payload.lng,
    repeat: payload.repeat || 'none',
    customDays: payload.customDays || [],
    attendees,
    createdBy: user._id,
  });
  try { if (attendees.length) await notifyUsers(attendees, 'events', 'New event', payload.title || ''); } catch (_) {}
  return event.toJSON();
}

async function updateEvent(user, id, updates) {
  const event = await Event.findById(id);
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(event.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const allowed = ['title', 'startAt', 'endAt', 'locationText', 'attendees', 'lat', 'lng', 'repeat', 'customDays'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'attendees') {
        await assertGroupAndAttendeesValid(event.groupId, updates.attendees);
        event.attendees = updates.attendees.map((id) => new mongoose.Types.ObjectId(id));
      } else if (key === 'startAt' || key === 'endAt') {
        event[key] = new Date(updates[key]);
      } else {
        event[key] = updates[key];
      }
    }
  }

  if (event.startAt && event.endAt && !(event.startAt < event.endAt)) {
    const err = new Error('startAt must be before endAt');
    err.status = 400;
    err.code = 'INVALID_TIME_RANGE';
    throw err;
  }

  await event.save();
  return event.toJSON();
}

async function setRsvp(user, eventId, status) {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(event.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const allowed = ['going', 'maybe', 'not'];
  if (!allowed.includes(status)) {
    const err = new Error('Invalid RSVP status');
    err.status = 400;
    err.code = 'INVALID_RSVP';
    throw err;
  }
  event.rsvps = event.rsvps || [];
  const idx = event.rsvps.findIndex((r) => String(r.userId) === String(user._id));
  if (idx >= 0) {
    event.rsvps[idx].status = status;
    event.rsvps[idx].at = new Date();
  } else {
    event.rsvps.push({ userId: user._id, status, at: new Date() });
  }
  await event.save();
  try { await notifyUsers(event.attendees || [], 'events', 'RSVP update', `${user.name || 'Someone'} is ${status}`); } catch (_) {}
  return event.toJSON();
}

async function getAttendeesWithStatus(user, eventId) {
  const event = await Event.findById(eventId).populate('attendees');
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404;
    err.code = 'EVENT_NOT_FOUND';
    throw err;
  }
  const userGroups = (user.groups || []).map(String);
  if (!userGroups.includes(String(event.groupId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const rsvpByUser = new Map((event.rsvps || []).map((r) => [String(r.userId), r.status]));
  const list = (event.attendees || []).map((u) => ({ id: String(u._id), name: u.name, email: u.email, status: rsvpByUser.get(String(u._id)) || 'maybe' }));
  return list;
}

function toICSDate(dt) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = dt.getUTCFullYear();
  const m = pad(dt.getUTCMonth() + 1);
  const d = pad(dt.getUTCDate());
  const hh = pad(dt.getUTCHours());
  const mm = pad(dt.getUTCMinutes());
  const ss = pad(dt.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

async function exportICal(user, { groupId } = {}) {
  const gid = groupId || getCurrentGroupIdForUser(user);
  const events = await Event.find({ groupId: gid }).sort({ startAt: 1 });
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RoomSync UT//Events//EN',
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${String(e._id)}@roomsync`);
    lines.push(`DTSTAMP:${toICSDate(new Date())}`);
    lines.push(`DTSTART:${toICSDate(new Date(e.startAt))}`);
    lines.push(`DTEND:${toICSDate(new Date(e.endAt))}`);
    if (e.title) lines.push(`SUMMARY:${e.title.replace(/\n/g, ' ')}`);
    if (e.locationText) lines.push(`LOCATION:${e.locationText.replace(/\n/g, ' ')}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

module.exports = { listEvents, createEvent, updateEvent, setRsvp, getAttendeesWithStatus, exportICal }; 