const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

let client = null;
let database = null;

async function connect() {
  if (!uri) throw new Error('MONGODB_URI is not set');

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  // Use DB name from env if provided, otherwise rely on URI
  database = client.db(process.env.MONGODB_DB_NAME || undefined);

  // Optional: verify connection with a ping
  await client.db('admin').command({ ping: 1 });
  console.log('MongoDB connected and pinged');

  return database;
}

function getDb() {
  if (!database) throw new Error('MongoDB not connected yet');
  return database;
}

async function close() {
  if (client) await client.close();
}

module.exports = { connect, getDb, close, client };
