const Users = require('../models/Users');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ),

    httpOnly: true,
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  if (req.body.password !== req.body.password1) {
    return next(new AppError('Passwords do not match', 400));
  }
  const { name, email, password, role } = req.body;
  const newUser = await Users.create({
    name,
    email,
    password,
    role,
  });
  //jwt
  createSendToken(newUser, 201, res);
});

//login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //check if user exists && password is correct
  const user = await Users.findOne({ email }).select('+password');

  //const isMatch = await user.correctPassword(password, user.password);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid Credentials', 401));
  }

  createSendToken(user, 200, res);
});

//middlware
exports.protect = catchAsync(async (req, res, next) => {
  //get token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }
  //validate token

  const decoded = await jwt.verify(token, process.env.JWT_SECRET);

  //check if user still exists
  const freshUser = await Users.findById(decoded.id);

  if (!freshUser) {
    return next(new AppError('The user does not exist', 401));
  }

  //check if user changed password after token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }

  //grant access to protected routes
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array

    if (!roles.includes(req.user.role)) {
      // console.log(req.user.role);
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

// exports.forgotPassword = catchAsync(async (res, res, next) => {
//   get user based on post request
//   const user = await Users.findOne({ email: req.body.email });
// });
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user

  const { email } = req.body;
  const user = await Users.findOne({ email });

  if (!user) {
    return next(new AppError('There is no user with this email', 404));
  }
  //reset token
  const resetToken = user.createPasswordResetToken();
  //console.log(resetToken);
  await user.save({ validateBeforeSave: false });

  //send email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/users/resetPassword/${resetToken}`;

  const message = `Forgot your Password? Submit a patch request with your new password to:${resetURL}.\nIf you didn't forget your password,please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min) ',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(new AppError('There was an error sending the email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //get user based on token
  if (req.body.password !== req.body.password1) {
    return next(new AppError('Passwords do not match', 400));
  }
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await Users.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gte: Date.now() },
  });
  //if token has not expired ,set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  //updtae changePasswordAt

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;

  await user.save();
  //log the user and send token
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //get user from collection
  if (req.body.password !== req.body.password1) {
    return next(new AppError('Passwords do not match', 400));
  }
  const user = await Users.findById(req.user.id).select('+password');

  //check if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  //then update password
  user.password = req.body.password;
  await user.save();

  //send jwt-token
  createSendToken(user, 200, res);
});
