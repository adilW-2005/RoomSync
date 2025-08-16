const Rating = require('../models/Rating');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');
const { loadEnv } = require('../config/env');

async function getAverageByPlace(placeId) {
  const result = await Rating.aggregate([
    { $match: { placeId } },
    { $group: { _id: '$placeId', avg: { $avg: '$stars' }, count: { $count: {} } } },
  ]);
  if (result.length === 0) return { placeId, avg: null, count: 0 };
  return { placeId, avg: Number(result[0].avg.toFixed(2)), count: result[0].count };
}

async function listByPlace(placeId) {
  const ratings = await Rating.find({ placeId }).sort({ createdAt: -1 });
  return ratings.map((r) => r.toJSON());
}

function distanceKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}

async function listFiltered({ kind, q, sort, lat, lng } = {}) {
  const filter = {};
  if (kind) filter.kind = kind;
  if (q) filter.placeName = { $regex: q, $options: 'i' };
  const ratings = await Rating.find(filter).sort({ createdAt: -1 }).limit(200);
  let mapped = ratings.map((r) => r.toJSON());
  if (lat !== undefined && lng !== undefined) {
    const origin = { lat: Number(lat), lng: Number(lng) };
    mapped = mapped.map((r) => ({ ...r, distanceKm: r.loc?.lat && r.loc?.lng ? distanceKm(origin, { lat: r.loc.lat, lng: r.loc.lng }) : null }));
  }
  if (sort === 'rating_desc') mapped.sort((a, b) => (b.stars || 0) - (a.stars || 0));
  if (sort === 'rating_asc') mapped.sort((a, b) => (a.stars || 0) - (b.stars || 0));
  if (sort === 'distance_asc') mapped.sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));
  return mapped;
}

async function createRating(user, payload) {
  let photos = Array.isArray(payload.photos) ? payload.photos : [];
  if (Array.isArray(payload.photosBase64) && payload.photosBase64.length) {
    const uploaded = [];
    for (const b64 of payload.photosBase64) {
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadBase64ToCloudinary(b64, 'ratings');
      uploaded.push(url);
    }
    photos = photos.concat(uploaded);
  }
  const rating = await Rating.create({
    authorId: user._id,
    kind: payload.kind,
    placeId: payload.placeId,
    placeName: payload.placeName,
    stars: Number(payload.stars),
    pros: payload.pros || [],
    cons: payload.cons || [],
    tips: payload.tips || '',
    photos,
  });
  return rating.toJSON();
}

async function updateRating(user, id, updates) {
  const rating = await Rating.findById(id);
  if (!rating) {
    const err = new Error('Rating not found');
    err.status = 404;
    err.code = 'RATING_NOT_FOUND';
    throw err;
  }
  if (String(rating.authorId) !== String(user._id)) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const allowed = ['stars', 'pros', 'cons', 'tips', 'photos'];
  for (const key of allowed) {
    if (updates[key] !== undefined) rating[key] = updates[key];
  }
  if (Array.isArray(updates.photosBase64) && updates.photosBase64.length) {
    const uploaded = [];
    for (const b64 of updates.photosBase64) {
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadBase64ToCloudinary(b64, 'ratings');
      uploaded.push(url);
    }
    rating.photos = (rating.photos || []).concat(uploaded);
  }
  await rating.save();
  return rating.toJSON();
}

async function deleteRating(user, id) {
  const rating = await Rating.findById(id);
  if (!rating) {
    const err = new Error('Rating not found');
    err.status = 404;
    err.code = 'RATING_NOT_FOUND';
    throw err;
  }
  if (String(rating.authorId) !== String(user._id)) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  await Rating.deleteOne({ _id: id });
  return { id };
}

function generatePlaceDeeplink(placeId) {
  const { APP_SCHEME, DEEP_LINK_HOST } = loadEnv();
  return { deep: `${APP_SCHEME}://place?placeId=${encodeURIComponent(placeId)}`, universal: `https://${DEEP_LINK_HOST}/place/${encodeURIComponent(placeId)}` };
}

module.exports = { getAverageByPlace, listByPlace, createRating, updateRating, deleteRating, listFiltered, generatePlaceDeeplink }; 