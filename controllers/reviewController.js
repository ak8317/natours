const Reviews = require('../models/Reviews');
const Review = require('../models/Reviews');
const catchAsync = require('../utils/catchAsync');

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Reviews.find();

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

exports.createReview = catchAsync(async (req, res, next) => {
  const newReview = await Reviews.create(req.body);

  res.status(201).json({
    status: 'success',

    data: {
      review: newReview,
    },
  });
});
