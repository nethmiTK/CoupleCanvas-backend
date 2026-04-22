require('dotenv').config();
require('express-async-errors');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/errorMiddleware');

const app = express();

// ---------------------- CORS Configuration ----------------------
const allowedOrigins = [
  'http://memoalbum.com',
  'http://www.memoalbum.com',
  'https://memoalbum.com',
  'https://www.memoalbum.com',
  'https://admin.memoalbum.com',
  'http://admin.memoalbum.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3002'
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const mergedAllowedOrigins = [...new Set([...allowedOrigins, ...envAllowedOrigins])];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); 
    if (mergedAllowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// ---------------------- Middleware ----------------------
app.use(express.json());

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

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ---------------------- Static Files & Routes ----------------------
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/api', routes);

// ---------------------- Error Handling ----------------------
app.use(notFound);
app.use(errorHandler);


module.exports = app;