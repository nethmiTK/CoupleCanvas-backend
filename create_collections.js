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
  'admin_approval_log',
  'sys_cat',
  'sub_plan',
  'admin'
];

 

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

async function createSystemCategory(db) {
  const categories = [
    {
      type: 'Wedding Photography',
      description: 'Professional wedding photography services',
      profilePic: 'https://example.com/wedding-photo.jpg',
      key: 'wedding_photo',
      status: 'active',
      createdAt: new Date()
    },
    {
      type: 'Wedding Album',
      description: 'Digital and printed wedding album services',
      profilePic: 'https://example.com/album.jpg',
      key: 'wedding_album',
      status: 'active',
      createdAt: new Date()
    },
    {
      type: 'Wedding Venue',
      description: 'Wedding venue booking services',
      profilePic: 'https://example.com/venue.jpg',
      key: 'wedding_venue',
      status: 'active',
      createdAt: new Date()
    },
    {
      type: 'Catering',
      description: 'Wedding catering and food services',
      profilePic: 'https://example.com/catering.jpg',
      key: 'catering',
      status: 'active',
      createdAt: new Date()
    },
    {
      type: 'Decoration',
      description: 'Wedding decoration and arrangement services',
      profilePic: 'https://example.com/decoration.jpg',
      key: 'decoration',
      status: 'active',
      createdAt: new Date()
    }
  ];
  await db.collection('sys_cat').deleteMany({});
  await db.collection('sys_cat').insertMany(categories);
  console.log('sys_cat collection created and seeded!');
}

async function createSubPlanCollection(db) {
  const plans = [
    {
      name: 'Basic Service',
      price: 5000,
      duration: 30,
      features: ['5 Listings', 'Basic Support', 'Standard Visibility'],
      vendorType: 'service',
      description: 'Perfect for getting started',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Standard Service',
      price: 10000,
      duration: 30,
      features: ['15 Listings', 'Priority Support', 'Enhanced Visibility', 'Analytics Dashboard'],
      vendorType: 'service',
      description: 'Great for growing businesses',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Premium Service',
      price: 25000,
      duration: 30,
      features: ['Unlimited Listings', '24/7 Support', 'Top Visibility', 'Advanced Analytics', 'Featured Badge'],
      vendorType: 'service',
      description: 'For established vendors',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Basic Album',
      price: 3000,
      duration: 30,
      features: ['3 Albums', 'Basic Templates', 'Standard Support'],
      vendorType: 'album',
      description: 'Start your album portfolio',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Pro Album',
      price: 8000,
      duration: 30,
      features: ['10 Albums', 'Premium Templates', 'Custom Design', 'Priority Support'],
      vendorType: 'album',
      description: 'Professional album services',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Basic Product',
      price: 4000,
      duration: 30,
      features: ['10 Products', 'Basic Shop', 'Standard Support'],
      vendorType: 'product',
      description: 'Start selling products',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Premium Product',
      price: 12000,
      duration: 30,
      features: ['Unlimited Products', 'Advanced Shop', 'Marketing Tools', 'Analytics'],
      vendorType: 'product',
      description: 'Full-featured product selling',
      status: 'active',
      createdAt: new Date()
    }
  ];
  await db.collection('sub_plan').deleteMany({});
  await db.collection('sub_plan').insertMany(plans);
  console.log('sub_plan collection created and seeded!');
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
