const Rating = require('../models/Rating');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');

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

async function listFiltered({ kind, q } = {}) {
  const filter = {};
  if (kind) filter.kind = kind;
  if (q) filter.placeName = { $regex: q, $options: 'i' };
  const ratings = await Rating.find(filter).sort({ createdAt: -1 }).limit(200);
  return ratings.map((r) => r.toJSON());
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

module.exports = { getAverageByPlace, listByPlace, createRating, updateRating, deleteRating, listFiltered }; 