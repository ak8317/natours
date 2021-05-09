const express = require('express');
const app = express();
const cors = require('cors');
const connectDB = require('./config/db');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const globalErrorHandler = require('./controllers/errorController');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

process.on('uncaughtException', (err) => {
  console.error(err.name, err.message);
  console.log('Shutting Down');
  process.exit(1);
});

require('dotenv').config();
//connecting db
connectDB();

//set secure http headers
app.use(helmet());

//limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP,please try again in an hour!',
});

app.use('/api', limiter);

//middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));

//Data sanitization against Nosql query injection
app.use(mongoSanitize());
///Data sanitization against XSS
app.use(xss());

//prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'price',
      'difficulty',
      'maxGroupSize',
    ],
  })
);

//routes
app.use('/api/tours', require('./routes/tours'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reviews', require('./routes/reviews'));

app.use(globalErrorHandler);
const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.error(err.name, err.message);
  server.close(() => {
    console.log('Shutting Down');
    process.exit(1);
  });
});
