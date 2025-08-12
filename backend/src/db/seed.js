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

(async () => {
  const env = loadEnv();
  await mongoose.connect(env.MONGO_URI, { dbName: 'roomsync' });

  const email = 'alex@utexas.edu';
  const password = 'test1234';
  const name = 'Alex Longhorn';
  const groupName = 'West Campus Unit';
  const groupCode = 'AB12CD';

  await User.deleteMany({ email });
  await Group.deleteMany({ code: groupCode });

  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name,
  });

  const group = await Group.create({ name: groupName, code: groupCode, members: [user._id] });
  await User.updateOne({ _id: user._id }, { $addToSet: { groups: group._id } });

  await Chore.deleteMany({ groupId: group._id });
  const now = new Date();
  const due1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const due2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  await Chore.create({
    groupId: group._id,
    title: 'Take out trash',
    assignees: [user._id],
    repeat: 'weekly',
    customDays: [],
    dueAt: due1,
    status: 'open',
    createdBy: user._id,
  });

  await Chore.create({
    groupId: group._id,
    title: 'Clean kitchen',
    assignees: [user._id],
    repeat: 'none',
    customDays: [],
    dueAt: due2,
    status: 'open',
    createdBy: user._id,
  });

  await Event.deleteMany({ groupId: group._id });
  const evStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const evEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
  await Event.create({
    groupId: group._id,
    title: 'Move-in Coordination',
    startAt: evStart,
    endAt: evEnd,
    locationText: 'Apartment Lobby',
    attendees: [user._id],
    createdBy: user._id,
  });

  await Expense.deleteMany({ groupId: group._id });
  await Expense.create({
    groupId: group._id,
    payerId: user._id,
    amount: 60,
    split: 'equal',
    shares: [{ userId: user._id, amount: 60 }],
    notes: 'Groceries',
  });

  await Inventory.deleteMany({ groupId: group._id });
  await Inventory.create({
    groupId: group._id,
    ownerId: user._id,
    name: 'Vacuum Cleaner',
    qty: 1,
    shared: true,
  });
  await Inventory.create({
    groupId: group._id,
    ownerId: user._id,
    name: 'Paper Towels',
    qty: 6,
    shared: true,
    expiresAt: undefined,
  });

  await Listing.deleteMany({});
  await Listing.create({
    sellerId: user._id,
    type: 'sublet',
    title: 'Summer Sublet at Waterloo',
    description: '1 bed available, June-August',
    price: 1200,
    photos: [],
    loc: { lat: 30.2816, lng: -97.7420 },
    availableFrom: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    availableTo: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
    status: 'active',
  });
  await Listing.create({
    sellerId: user._id,
    type: 'furniture',
    title: 'IKEA Desk',
    description: 'Like new, pickup near campus',
    price: 60,
    photos: [],
    loc: { lat: 30.2870, lng: -97.7428 },
    status: 'active',
  });

  await Rating.deleteMany({});
  await Rating.create({
    authorId: user._id,
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
    authorId: user._id,
    kind: 'apartment',
    placeId: 'waterloo',
    placeName: 'Waterloo',
    stars: 5,
    pros: ['Modern'],
    cons: ['Pricey'],
    tips: 'Apply early',
    photos: [],
  });

  // eslint-disable-next-line no-console
  console.log('Seeded:', { user: user.toJSON(), group: group.toJSON() });
  await mongoose.disconnect();
})(); 