const Rating = require('../models/Rating');

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

async function createRating(user, payload) {
  const rating = await Rating.create({
    authorId: user._id,
    kind: payload.kind,
    placeId: payload.placeId,
    placeName: payload.placeName,
    stars: Number(payload.stars),
    pros: payload.pros || [],
    cons: payload.cons || [],
    tips: payload.tips || '',
    photos: Array.isArray(payload.photos) ? payload.photos : [],
  });
  return rating.toJSON();
}

module.exports = { getAverageByPlace, listByPlace, createRating }; 