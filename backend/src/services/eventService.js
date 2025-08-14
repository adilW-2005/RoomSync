const mongoose = require('mongoose');
const Event = require('../models/Event');
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

module.exports = { listEvents, createEvent, updateEvent }; 