const Listing = require('../models/Listing');
const User = require('../models/User');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');

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
  let photos = Array.isArray(payload.photos) ? payload.photos : [];
  if (Array.isArray(payload.photosBase64) && payload.photosBase64.length) {
    const uploaded = [];
    for (const b64 of payload.photosBase64) {
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadBase64ToCloudinary(b64, 'listings');
      uploaded.push(url);
    }
    photos = photos.concat(uploaded);
  }
  const listing = await Listing.create({
    sellerId: user._id,
    type: payload.type,
    title: payload.title,
    description: payload.description || '',
    price: Number(payload.price),
    photos,
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

async function toggleFavorite(user, listingId, fav) {
  const op = fav ? { $addToSet: { favoriteListings: listingId } } : { $pull: { favoriteListings: listingId } };
  await User.updateOne({ _id: user._id }, op);
  const fresh = await User.findById(user._id);
  return fresh.toJSON();
}

module.exports = { listListings, createListing, updateListing, toggleFavorite }; 