const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { loadEnv } = require('../config/env');
const User = require('../models/User');
const Group = require('../models/Group');
const Chore = require('../models/Chore');
const Event = require('../models/Event');
const Expense = require('../models/Expense');
const Inventory = require('../models/Inventory');
const Listing = require('../models/Listing');
const Rating = require('../models/Rating');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Hangout = require('../models/Hangout');
const ScheduleEvent = require('../models/ScheduleEvent');

async function runSeed(options = {}) {
  const env = loadEnv();
  await mongoose.connect(env.MONGO_URI);

  const wipeAll = Boolean(options.wipeAll);
  try {
    if (wipeAll) {
      await Promise.all([
        User.deleteMany({}),
        Group.deleteMany({}),
        Chore.deleteMany({}),
        Event.deleteMany({}),
        Expense.deleteMany({}),
        Inventory.deleteMany({}),
        Listing.deleteMany({}),
        Conversation.deleteMany({}),
        Message.deleteMany({}),
        Notification.deleteMany({}),
        Rating.deleteMany({}),
      ]);
    }

    // Clear a known demo namespace by email/username/group code
    const demoUsers = [
      { email: 'alex@utexas.edu', username: 'alex', name: 'Alex Longhorn' },
      { email: 'blair@utexas.edu', username: 'blair', name: 'Blair Bevo' },
      { email: 'casey@utexas.edu', username: 'casey', name: 'Casey Tower' },
    ];
    const groupName = 'West Campus Unit';
    const groupCode = 'AB12CD';

    await User.deleteMany({ email: { $in: demoUsers.map((u) => u.email) } });
    await User.deleteMany({ username: { $in: demoUsers.map((u) => u.username) } });
    await Group.deleteMany({ code: groupCode });

    // Create users with passwords
    const password = 'test1234';
    const [alex, blair, casey] = await Promise.all(
      demoUsers.map(async (info) => User.create({
        email: info.email,
        passwordHash: await bcrypt.hash(password, 10),
        name: info.name,
        username: info.username,
        showContact: true,
      }))
    );

    // Create a group and add all three users
    const group = await Group.create({ name: groupName, code: groupCode, members: [alex._id, blair._id, casey._id], memberRoles: [{ user: alex._id, role: 'owner' }] });
    await Promise.all([
      User.updateOne({ _id: alex._id }, { $addToSet: { groups: group._id } }),
      User.updateOne({ _id: blair._id }, { $addToSet: { groups: group._id } }),
      User.updateOne({ _id: casey._id }, { $addToSet: { groups: group._id } }),
    ]);

    // Reset group-scoped resources
    await Promise.all([
      Chore.deleteMany({ groupId: group._id }),
      Event.deleteMany({ groupId: group._id }),
      Expense.deleteMany({ groupId: group._id }),
      Inventory.deleteMany({ groupId: group._id }),
    ]);

    // Clear global messaging for a clean demo
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});

    const now = new Date();

    // Chores: one weekly assigned to Alex+Blair, one one-time to Casey
    const due1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const due2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    await Chore.create({
      groupId: group._id,
      title: 'Take out trash',
      assignees: [alex._id, blair._id],
      repeat: 'weekly',
      customDays: [due1.getDay()],
      dueAt: due1,
      status: 'open',
      createdBy: alex._id,
      pointsPerCompletion: 10,
    });
    await Chore.create({
      groupId: group._id,
      title: 'Clean kitchen',
      assignees: [casey._id],
      repeat: 'none',
      customDays: [],
      dueAt: due2,
      status: 'open',
      createdBy: alex._id,
      pointsPerCompletion: 15,
    });

    // Events: one timed with attendees and coords, one all-day
    const evStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const evEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
    await Event.create({
      groupId: group._id,
      title: 'Move-in Coordination',
      startAt: evStart,
      endAt: evEnd,
      locationText: 'Apartment Lobby',
      lat: 30.2861,
      lng: -97.7394,
      attendees: [alex._id, blair._id],
      createdBy: alex._id,
    });
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 0, 0, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 23, 59, 59, 999);
    await Event.create({
      groupId: group._id,
      title: 'Group Dinner',
      startAt: dayStart,
      endAt: dayEnd,
      locationText: 'Guadalupe St.',
      attendees: [alex._id, casey._id],
      createdBy: blair._id,
    });

    // Expenses: equal split for groceries, custom split for utilities
    const groceries = await Expense.create({
      groupId: group._id,
      payerId: alex._id,
      amount: 90,
      split: 'equal',
      shares: [
        { userId: alex._id, amount: 30 },
        { userId: blair._id, amount: 30 },
        { userId: casey._id, amount: 30 },
      ],
      notes: 'Groceries',
    });
    const utilities = await Expense.create({
      groupId: group._id,
      payerId: blair._id,
      amount: 120,
      split: 'custom',
      shares: [
        { userId: alex._id, amount: 30 },
        { userId: blair._id, amount: 60 },
        { userId: casey._id, amount: 30 },
      ],
      notes: 'Utilities',
    });

    // Inventory: mixed shared and personal, one with expiry
    await Inventory.create({ groupId: group._id, ownerId: alex._id, name: 'Vacuum Cleaner', qty: 1, shared: true });
    await Inventory.create({ groupId: group._id, ownerId: blair._id, name: 'Paper Towels', qty: 6, shared: true });
    await Inventory.create({ groupId: group._id, ownerId: casey._id, name: 'Milk', qty: 1, shared: false, expiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) });

    // Listings: clear all, add sublet with loc, furniture with no loc (optional), textbooks
    await Listing.deleteMany({});
    const sublet = await Listing.create({
      sellerId: alex._id,
      type: 'sublet',
      title: 'Summer Sublet at Waterloo',
      description: '1 bed available, June-August',
      price: 1200,
      photos: [],
      loc: { lat: 30.2816, lng: -97.7420 },
      availableFrom: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      availableTo: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
      status: 'available',
    });
    const desk = await Listing.create({
      sellerId: blair._id,
      type: 'furniture',
      title: 'IKEA Desk',
      description: 'Like new, pickup near campus',
      price: 60,
      photos: [],
      status: 'available',
    });
    const book = await Listing.create({
      sellerId: casey._id,
      type: 'textbooks',
      title: 'CS Textbook',
      description: 'Used but in good condition',
      price: 35,
      photos: [],
      status: 'available',
    });

    // Messaging seed: one DM (Blair → Alex) and one listing conversation (Alex → Blair about IKEA Desk)
    const dm = await Conversation.create({
      type: 'dm',
      participants: [
        { userId: alex._id, unreadCount: 1, lastReadAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
        { userId: blair._id, unreadCount: 0, lastReadAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
      ],
    });
    const dmMsg = await Message.create({ conversationId: dm._id, fromUserId: blair._id, toUserId: alex._id, text: 'Hey Alex, want to split utilities this month?', photos: [], createdAt: new Date(now.getTime() - 30 * 60 * 1000) });
    dm.lastMessage = { text: dmMsg.text, photos: [], fromUserId: blair._id, createdAt: dmMsg.createdAt };
    await dm.save();

    const listConvo = await Conversation.create({
      type: 'listing',
      listingId: desk._id,
      participants: [
        { userId: alex._id, unreadCount: 0, lastReadAt: new Date(now.getTime() - 60 * 60 * 1000) },
        { userId: blair._id, unreadCount: 1, lastReadAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      ],
    });
    const listMsg = await Message.create({ conversationId: listConvo._id, listingId: desk._id, fromUserId: alex._id, toUserId: blair._id, text: 'Hi! Is the IKEA desk still available?', photos: [], createdAt: new Date(now.getTime() - 10 * 60 * 1000) });
    listConvo.lastMessage = { text: listMsg.text, photos: [], fromUserId: alex._id, createdAt: listMsg.createdAt };
    await listConvo.save();

    // Notifications: seed a few sample notifications per user across categories
    await Notification.create({
      userId: alex._id,
      type: 'chore_due_soon',
      category: 'chores',
      title: 'Chore due tomorrow',
      body: 'Take out trash is due tomorrow.',
      data: { choreTitle: 'Take out trash', groupId: group._id },
      deeplink: 'roomsyncut://chores',
      channels: ['inapp'],
      status: 'queued',
    });
    await Notification.create({
      userId: blair._id,
      type: 'event_upcoming',
      category: 'events',
      title: 'Upcoming event',
      body: 'Move-in Coordination starts soon.',
      data: { eventTitle: 'Move-in Coordination', groupId: group._id },
      deeplink: 'roomsyncut://events',
      channels: ['inapp'],
      status: 'queued',
    });
    await Notification.create({
      userId: alex._id,
      type: 'chat_new_message',
      category: 'chat',
      title: 'New message',
      body: 'Blair: Hey Alex, want to split utilities this month?',
      data: { conversationId: dm._id },
      deeplink: 'roomsyncut://inbox',
      channels: ['inapp'],
      status: 'queued',
    });
    await Notification.create({
      userId: blair._id,
      type: 'marketplace_message',
      category: 'marketplace',
      title: 'Listing inquiry',
      body: 'Alex asked about your IKEA Desk.',
      data: { listingId: desk._id, conversationId: listConvo._id },
      deeplink: 'roomsyncut://marketplace',
      channels: ['inapp'],
      status: 'queued',
    });

    // Ratings: a couple for map overlay
    await Rating.deleteMany({});
    await Rating.create({
      authorId: alex._id,
      kind: 'dorm',
      placeId: 'jester-east',
      placeName: 'Jester East',
      stars: 4,
      pros: ['Location', 'Community'],
      cons: ['Noise'],
      tips: 'Bring earplugs',
      photos: [],
    });
    await Rating.create({
      authorId: blair._id,
      kind: 'apartment',
      placeId: 'waterloo',
      placeName: 'Waterloo',
      stars: 5,
      pros: ['Modern'],
      cons: ['Pricey'],
      tips: 'Apply early',
      photos: [],
    });

    // Hangouts: simple proposal with options and one message
    if (typeof Hangout !== 'undefined') {
      await Hangout.deleteMany({ groupId: group._id });
      await Hangout.create({
        groupId: group._id,
        title: 'Coffee at Jester? ',
        description: 'Tonight 7pm',
        options: [
          { id: 'opt1', label: 'Yes', when: new Date(now.getTime() + 6 * 60 * 60 * 1000) },
          { id: 'opt2', label: 'No', when: new Date(now.getTime() + 6 * 60 * 60 * 1000) },
        ],
        votes: [
          { userId: alex._id, optionId: 'opt1', at: new Date() },
        ],
        messages: [
          { userId: blair._id, text: 'Sounds good to me!', createdAt: new Date(now.getTime() - 5 * 60 * 1000) },
        ],
        createdBy: alex._id,
      });
    }

    // Schedule events: 1-2 classes per user
    if (typeof ScheduleEvent !== 'undefined') {
      await ScheduleEvent.deleteMany({ userId: { $in: [alex._id, blair._id, casey._id] } });
      await ScheduleEvent.insertMany([
        { userId: alex._id, course: 'CS 314', title: 'Data Structures', building: 'GDC', room: '2.210', days: ['M','W','F'], start_time: '10:00', end_time: '10:50' },
        { userId: blair._id, course: 'MATH 408C', title: 'Calc I', building: 'RLM', room: '4.102', days: ['T','Th'], start_time: '09:30', end_time: '10:45' },
        { userId: casey._id, course: 'UGS 302', title: 'First-Year Seminar', building: 'WEL', room: '1.308', days: ['M','W'], start_time: '13:00', end_time: '14:15' },
      ]);
    }

    // eslint-disable-next-line no-console
    console.log('Seeded demo data:', {
      users: [alex.toJSON().email, blair.toJSON().email, casey.toJSON().email],
      group: group.toJSON().name,
      expenses: [groceries.toJSON().id, utilities.toJSON().id],
    });
  } finally {
    await mongoose.disconnect();
  }
}

module.exports = { runSeed };

if (require.main === module) {
  const args = process.argv.slice(2);
  const wipe = args.includes('--wipe') || args.includes('--clean');
  runSeed({ wipeAll: wipe })
    .then(() => process.exit(0))
    .catch((err) => { console.error('Seed failed', err); process.exit(1); });
} 