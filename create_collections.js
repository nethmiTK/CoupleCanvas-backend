// Run this script once to auto-create all required MongoDB collections
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

const collections = [
  'users',
  'customers',
  'vendor_profiles',
  'vendor_products',
  'vendor_proposal',
  'vendor_album_template',
  'vendor_video',
  'vendor_settings',
  'vendor_services_albums',
  'product_categories',
  'albums',
  'services',
  'service_posts',
  'chat_messages',
  'payments',
  'contacts',
  'admin_approval_log'
];

async function createSystemCategory(db) {
  const categories = [
    {
      id: 'admin',
      name: 'Admin',
      description: 'Admin category',
      pic: 'admin.png'
    },
    {
      id: 'proposal',
      name: 'Proposal',
      description: 'Proposal category',
      pic: 'proposal.png'
    },
    {
      id: 'services',
      name: 'Services',
      description: 'Services category',
      pic: 'services.png'
    },
    {
      id: 'product',
      name: 'Product',
      description: 'Product category',
      pic: 'product.png'
    }
  ];
  await db.collection('system_category').deleteMany({}); // Clear if exists
  await db.collection('system_category').insertMany(categories);
  console.log('system_category collection created and seeded!');
}

async function createSubPlanCollection(db) {
  const subPlans = [
    { id: 1, typename: 'Basic', days: 30, price: 1000 },
    { id: 2, typename: 'Standard', days: 90, price: 2500 },
    { id: 3, typename: 'Premium', days: 365, price: 8000 }
  ];
  await db.collection('sub_plan').deleteMany({});
  await db.collection('sub_plan').insertMany(subPlans);
  console.log('sub_plan collection created and seeded!');
}

async function createVendorCollection(db) {
  const vendors = [
    {
      id: 1,
      name: 'Vendor One',
      pic: 'vendor1.png',
      category_id: 'services',
      sub_plan_id: 1,
      address: '123 Main St',
      email: 'vendor1@example.com',
      phone_no: '0712345678',
      password: await bcrypt.hash('vendorpass1', 10),
      sex: 'male',
      payment_slip: 'slip1.png'
    },
    {
      id: 2,
      name: 'Vendor Two',
      pic: 'vendor2.png',
      category_id: 'product',
      sub_plan_id: 2,
      address: '456 Second St',
      email: 'vendor2@example.com',
      phone_no: '0723456789',
      password: await bcrypt.hash('vendorpass2', 10),
      sex: 'female',
      payment_slip: 'slip2.png'
    }
  ];
  await db.collection('vendor').deleteMany({});
  await db.collection('vendor').insertMany(vendors);
  console.log('vendor collection created and seeded!');
}

async function createAdminCollection(db) {
  const password = await bcrypt.hash('admin123', 10);
  const admin = {
    id: 1,
    name: 'Super Admin',
    email: 'admin@example.com',
    password,
    created_at: new Date(),
    last_login: null
  };
  await db.collection('admin').deleteMany({}); // Clear if exists
  await db.collection('admin').insertOne(admin);
  console.log('admin collection created and seeded!');
}


async function main() {
  const client = new MongoClient(uri, {
    tls: true,
    tlsInsecure: true,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    minPoolSize: 1,
  });
  await client.connect();
  const db = client.db(dbName);

  for (const name of collections) {
    // Insert a dummy doc to create the collection
    await db.collection(name).insertOne({ _init: true });
    console.log(`Created collection: ${name}`);
  }

  await createSystemCategory(db);
  await createSubPlanCollection(db);
  await createVendorCollection(db);
  await createAdminCollection(db);

  await client.close();
  console.log('All collections created!');
}

main().catch(console.error);
