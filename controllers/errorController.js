const AppError = require('./../utils/appError');
let env = process.env.NODE_ENV || 'production';
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  //console.log(err);
  const value = Object.keys(err.keyValue)[0];
  // console.log(value);

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};
const handleJWTError = (err) => {
  return new AppError('Invalid token.Please log in again', 401);
};
const handleJwtExpireError = (err) => {
  return new AppError('Your token has expired! Please log in again', 401);
};
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  //console.log(err.isOperational);

  if (err.isOperational) {
    console.log(err);
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    //console.error(err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';
  if (err.name === 'CastError') error = handleCastErrorDB(error);
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);
  if (err.name === 'ValidationError') {
    error = handleValidationErrorDB(error);
  }
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError(error);
  }
  if (err.name === 'TokenExpiredError') error = handleJwtExpireError(error);
  if (error.isOperational) {
    //console.log(error);
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  } else {
    console.log(err.name);
    // console.log(error);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};
