const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

let database = null;

async function connect() {
  if (!uri) throw new Error('MONGODB_URI is not set');

  // Connect using mongoose with proper options for Node 22+
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'couplecanvas',
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });

  database = mongoose.connection.db;
  console.log('✅ MongoDB connected successfully!');

  return database;
}

function getDb() {
  if (!database) throw new Error('MongoDB not connected yet');
  return database;
}

async function close() {
  await mongoose.connection.close();
}

// Export mongoose connection as well
module.exports = { connect, getDb, close, mongoose };
