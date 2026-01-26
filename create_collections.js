// Seed the 'services' collection with sample data
async function createServicesCollection(db) {
  const services = [
    {
      name: 'Wedding Photography',
      description: 'Capture your special moments with our professional wedding photography service.',
      image: 'uploads/services/photo1.jpg',
      createdAt: new Date(),
    },
    {
      name: 'Venue Decoration',
      description: 'Beautiful and creative decoration for your wedding venue.',
      image: 'uploads/services/decor1.jpg',
      createdAt: new Date(),
    },
    {
      name: 'Catering',
      description: 'Delicious food and catering services for your guests.',
      image: 'uploads/services/catering1.jpg',
      createdAt: new Date(),
    },
    {
      name: 'Music Band',
      description: 'Live music band to entertain your wedding party.',
      image: 'uploads/services/music1.jpg',
      createdAt: new Date(),
    },
  ];
  await db.collection('services').deleteMany({});
  await db.collection('services').insertMany(services);
  console.log('services collection created and seeded!');
}
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
  'service_categories',
  'sub_plan',
  'admin',
  'vendors',
  'album_vendors',
  'service_vendors',
  'product_vendors',
  'proposal_vendors',
  'vendor_services'
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


async function createServiceCategories(db) {
  const categories = [
    {
      name: 'Wedding Photography',
      description: 'Professional wedding photography services',
      icon: '📸',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Wedding Venue',
      description: 'Wedding venue booking services',
      icon: '🏛️',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Catering',
      description: 'Wedding catering and food services',
      icon: '🍽️',
      status: 'active',
      createdAt: new Date()
    },
    {
      name: 'Decoration',
      description: 'Wedding decoration and arrangement services',
      icon: '🎉',
      status: 'active',
      createdAt: new Date()
    }
  ];
  await db.collection('service_categories').deleteMany({});
  await db.collection('service_categories').insertMany(categories);
  console.log('service_categories collection created and seeded!');
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

async function createVendorsCollection(db) {
  // This will be populated by registration endpoint
  // Adding some dummy vendors for testing
  const dummyVendors = [
    {
      email: 'album@example.com',
      username: 'albumvendor01',
      password: await bcrypt.hash('password123', 10),
      address: 'Colombo, Sri Lanka',
      birthdate: '1990-05-15',
      sex: 'male',
      vendorTypes: ['album'],
      subscriptionPlan: 'Basic Album',
      planPrice: 3000,
      status: 'approved',
      createdAt: new Date()
    },
    {
      email: 'service@example.com',
      username: 'servicevendor01',
      password: await bcrypt.hash('password123', 10),
      address: 'Galle, Sri Lanka',
      birthdate: '1992-08-20',
      sex: 'female',
      vendorTypes: ['services'],
      subscriptionPlan: 'Basic Service',
      planPrice: 5000,
      status: 'approved',
      createdAt: new Date()
    },
    {
      email: 'product@example.com',
      username: 'productvendor01',
      password: await bcrypt.hash('password123', 10),
      address: 'Kandy, Sri Lanka',
      birthdate: '1988-03-10',
      sex: 'male',
      vendorTypes: ['product'],
      subscriptionPlan: 'Basic Product',
      planPrice: 4000,
      status: 'pending',
      createdAt: new Date()
    },
    {
      email: 'proposal@example.com',
      username: 'proposalvendor01',
      password: await bcrypt.hash('password123', 10),
      address: 'Negombo, Sri Lanka',
      birthdate: '1995-11-25',
      sex: 'female',
      vendorTypes: ['proposal'],
      subscriptionPlan: 'Basic Service',
      planPrice: 5000,
      status: 'approved',
      createdAt: new Date()
    }
  ];
  await db.collection('vendors').deleteMany({});
  await db.collection('vendors').insertMany(dummyVendors);
  console.log('vendors collection created with dummy data!');
}

async function createAlbumVendorsCollection(db) {
  // Schema: { vendor_id, name, profilePic, whatsappNo, slipPhoto, status, createdAt }
  const albumVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Royal Album Studio',
      profilePic: 'uploads/album_vendors/studio1.jpg',
      whatsappNo: '+94712345678',
      slipPhoto: 'uploads/slips/slip_album_1.jpg',
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Wedding Memories Albums',
      profilePic: 'uploads/album_vendors/studio2.jpg',
      whatsappNo: '+94723456789',
      slipPhoto: 'uploads/slips/slip_album_2.jpg',
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Premium Photo Albums',
      profilePic: 'uploads/album_vendors/studio3.jpg',
      whatsappNo: '+94734567890',
      slipPhoto: 'uploads/slips/slip_album_3.jpg',
      status: 'pending',
      createdAt: new Date()
    }
  ];
  await db.collection('album_vendors').deleteMany({});
  await db.collection('album_vendors').insertMany(albumVendors);
  console.log('album_vendors collection created with dummy data!');
}

async function createServiceVendorsCollection(db) {
  // Schema: { vendor_id, whatsappNo, profilePic, slipPhoto, selectedServices[], status, createdAt }
  const serviceVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      whatsappNo: '+94712111222',
      profilePic: 'uploads/service_vendors/service1.jpg',
      slipPhoto: 'uploads/slips/slip_service_1.jpg',
      selectedServices: ['Wedding Photography', 'Wedding Venue'],
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      whatsappNo: '+94723222333',
      profilePic: 'uploads/service_vendors/service2.jpg',
      slipPhoto: 'uploads/slips/slip_service_2.jpg',
      selectedServices: ['Catering', 'Decoration'],
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      whatsappNo: '+94734333444',
      profilePic: 'uploads/service_vendors/service3.jpg',
      slipPhoto: 'uploads/slips/slip_service_3.jpg',
      selectedServices: ['Wedding Photography', 'Music Band', 'Catering'],
      status: 'pending',
      createdAt: new Date()
    }
  ];
  await db.collection('service_vendors').deleteMany({});
  await db.collection('service_vendors').insertMany(serviceVendors);
  console.log('service_vendors collection created with dummy data!');
}

async function createProductVendorsCollection(db) {
  // Schema: { vendor_id, companyName, logoPic, description, whatsappNo, slipPhoto, status, createdAt }
  const productVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      companyName: 'Royal Wedding Gifts',
      logoPic: 'uploads/product_vendors/logo1.jpg',
      description: 'Premium wedding gifts and souvenirs for your special day',
      whatsappNo: '+94712444555',
      slipPhoto: 'uploads/slips/slip_product_1.jpg',
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      companyName: 'Invitation Cards Sri Lanka',
      logoPic: 'uploads/product_vendors/logo2.jpg',
      description: 'Elegant and customized wedding invitation cards',
      whatsappNo: '+94723555666',
      slipPhoto: 'uploads/slips/slip_product_2.jpg',
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      companyName: 'Wedding Decorations Plus',
      logoPic: 'uploads/product_vendors/logo3.jpg',
      description: 'Complete wedding decoration supplies and materials',
      whatsappNo: '+94734666777',
      slipPhoto: 'uploads/slips/slip_product_3.jpg',
      status: 'pending',
      createdAt: new Date()
    }
  ];
  await db.collection('product_vendors').deleteMany({});
  await db.collection('product_vendors').insertMany(productVendors);
  console.log('product_vendors collection created with dummy data!');
}

async function createProposalVendorsCollection(db) {
  // Schema: { vendor_id, name, profilePic, whatsappNo, slipPhoto, status, createdAt }
  const proposalVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'John Smith - Proposal Expert',
      profilePic: 'uploads/proposal_vendors/artist1.jpg',
      whatsappNo: '+94712777888',
      slipPhoto: 'uploads/slips/slip_proposal_1.jpg',
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Romantic Moments Events',
      profilePic: 'uploads/proposal_vendors/artist2.jpg',
      whatsappNo: '+94723888999',
      slipPhoto: 'uploads/slips/slip_proposal_2.jpg',
      status: 'approved',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Love Story Planners',
      profilePic: 'uploads/proposal_vendors/artist3.jpg',
      whatsappNo: '+94734999000',
      slipPhoto: 'uploads/slips/slip_proposal_3.jpg',
      status: 'pending',
      createdAt: new Date()
    }
  ];
  await db.collection('proposal_vendors').deleteMany({});
  await db.collection('proposal_vendors').insertMany(proposalVendors);
  console.log('proposal_vendors collection created with dummy data!');
}

async function createVendorServicesCollection(db) {
  // Schema: { vendor_id, service_id, status, createdAt }
  const vendorServices = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      service_id: 'Wedding Photography',
      status: 'active',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      service_id: 'Catering',
      status: 'active',
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      service_id: 'Music Band',
      status: 'active',
      createdAt: new Date()
    }
  ];
  await db.collection('vendor_services').deleteMany({});
  await db.collection('vendor_services').insertMany(vendorServices);
  console.log('vendor_services collection created with dummy data!');
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


  await createServiceCategories(db);
  await createSubPlanCollection(db);
  await createVendorCollection(db);
  await createAdminCollection(db);
  await createServicesCollection(db);
  await createVendorsCollection(db);
  await createAlbumVendorsCollection(db);
  await createServiceVendorsCollection(db);
  await createProductVendorsCollection(db);
  await createProposalVendorsCollection(db);
  await createVendorServicesCollection(db);

  await client.close();
  console.log('All collections created!');
}

main().catch(console.error);
