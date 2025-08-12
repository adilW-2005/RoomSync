const Listing = require('../models/Listing');

async function listListings(query = {}) {
  const filter = {};
  if (query.type) filter.type = query.type;
  if (query.q) filter.title = { $regex: query.q, $options: 'i' };
  if (query.min !== undefined || query.max !== undefined) {
    filter.price = {};
    if (query.min !== undefined) filter.price.$gte = Number(query.min);
    if (query.max !== undefined) filter.price.$lte = Number(query.max);
  }
  filter.status = 'active';
  const items = await Listing.find(filter).sort({ createdAt: -1 });
  return items.map((i) => i.toJSON());
}

async function createListing(user, payload) {
  const listing = await Listing.create({
    sellerId: user._id,
    type: payload.type,
    title: payload.title,
    description: payload.description || '',
    price: Number(payload.price),
    photos: Array.isArray(payload.photos) ? payload.photos : [],
    loc: { lat: Number(payload.loc.lat), lng: Number(payload.loc.lng) },
    availableFrom: payload.availableFrom ? new Date(payload.availableFrom) : undefined,
    availableTo: payload.availableTo ? new Date(payload.availableTo) : undefined,
    status: 'active',
  });
  return listing.toJSON();
}

async function updateListing(user, id, updates) {
  const listing = await Listing.findById(id);
  if (!listing) {
    const err = new Error('Listing not found');
    err.status = 404;
    err.code = 'LISTING_NOT_FOUND';
    throw err;
  }
  if (String(listing.sellerId) !== String(user._id)) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const allowed = ['title', 'description', 'price', 'photos', 'loc', 'availableFrom', 'availableTo', 'status', 'type'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'price') listing.price = Number(updates.price);
      else if (key === 'loc') listing.loc = { lat: Number(updates.loc.lat), lng: Number(updates.loc.lng) };
      else if (key === 'availableFrom' || key === 'availableTo') listing[key] = updates[key] ? new Date(updates[key]) : undefined;
      else listing[key] = updates[key];
    }
  }
  await listing.save();
  return listing.toJSON();
}

module.exports = { listListings, createListing, updateListing }; 