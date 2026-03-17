require('dotenv').config();
require('express-async-errors');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ---------------------- Security ----------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', '*'],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
    },
  },
}));

// ---------------------- CORS ----------------------
const allowedOrigins = [
  'http://memoalbum.com',
  'http://www.memoalbum.com',
  'https://memoalbum.com',
  'https://www.memoalbum.com',
  'https://admin.memoalbum.com',
  'http://admin.memoalbum.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server, mobile apps, curl, etc.
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ---------------------- Parsing & Logging ----------------------
app.use(express.json());

// Only use morgan in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ---------------------- Static files ----------------------
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ---------------------- Routes ----------------------
app.use('/api', routes);

// ---------------------- Error handling ----------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;