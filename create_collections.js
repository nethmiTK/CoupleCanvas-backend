// Run this script once to auto-create all required MongoDB collections
require('dotenv').config();
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

const collections = [
  'users',
  'customers',
  'photographers',
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
  'vendor_services',
  'template_categories',
  'album_templates',
  'template_pages',
  'album_pages',
  'template_extra_layout_sequence',
  'uploads',
  'album_page_slots',
  'layout_presets',
  'vendor_subscriptions',
];

// ============================================================
// HELPER: Safely create index with duplicate detection
// ============================================================
async function createIndexSafely(collection, indexSpec, options = {}) {
  try {
    const indexes = await collection.indexes(); // ✅ correct method
    const indexName = options.name || Object.keys(indexSpec).join('_');

    const exists = indexes.some(idx => idx.name === indexName);

    if (exists) {
      console.log(`   ℹ️  Index already exists: ${indexName}`);
      return;
    }

    await collection.createIndex(indexSpec, options);
    console.log(`   ✅ Created index: ${indexName}`);
  } catch (error) {
    if (error.code === 85) {
      console.log(`   ⚠️  Index exists (different options)`);
    } else {
      console.error(`   ❌ Error creating index:`, error.message);
    }
  }
}

// ============================================================
// HELPER: Check if collection has real data (not seed data)
// ============================================================
async function hasRealData(collection) {
  try {
    const count = await collection.countDocuments({
      _seedData: { $exists: false } // Mark seed data with this flag
    });
    return count > 0;
  } catch {
    return false;
  }
}

// ============================================================
// COLLECTION CREATION FUNCTIONS
// ============================================================

async function createServicesCollection(db) {
  const services = [
    {
      name: 'Wedding Photography',
      description: 'Capture your special moments with our professional wedding photography service.',
      image: 'uploads/services/photo1.jpg',
      _seedData: true, // Mark as seed data
      createdAt: new Date(),
    },
    {
      name: 'Venue Decoration',
      description: 'Beautiful and creative decoration for your wedding venue.',
      image: 'uploads/services/decor1.jpg',
      _seedData: true,
      createdAt: new Date(),
    },
    {
      name: 'Catering',
      description: 'Delicious food and catering services for your guests.',
      image: 'uploads/services/catering1.jpg',
      _seedData: true,
      createdAt: new Date(),
    },
    {
      name: 'Music Band',
      description: 'Live music band to entertain your wedding party.',
      image: 'uploads/services/music1.jpg',
      _seedData: true,
      createdAt: new Date(),
    },
  ];

  // Only seed if no real data exists
  const hasReal = await hasRealData(db.collection('services'));
  if (hasReal) {
    console.log('📍 services: Has real data, skipping seed');
    return;
  }

  await db.collection('services').deleteMany({ _seedData: true }); // Only delete seed data
  await db.collection('services').insertMany(services);
  console.log('📍 services: Collection seeded');
}

async function createLayoutPresets(db) {
  const presets = [
    {
      name: 'full_bleed',
      label: 'Full Bleed',
      type: 'full',
      slots: 1,
      thumbnail: '🖼️',
      pageCount: 20,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 600, h: 400, radius: 0 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'split_2',
      label: 'Split',
      type: 'split',
      slots: 2,
      thumbnail: '⬛⬛',
      pageCount: 20,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 295, h: 400, radius: 0 },
          { type: 'image', x: 305, y: 0, w: 295, h: 400, radius: 0 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'grid_3',
      label: 'Grid 3',
      type: 'grid',
      slots: 3,
      thumbnail: '🔲🔲🔲',
      pageCount: 30,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 600, h: 200, radius: 8 },
          { type: 'image', x: 0, y: 210, w: 295, h: 190, radius: 8 },
          { type: 'image', x: 305, y: 210, w: 295, h: 190, radius: 8 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'grid_4',
      label: '4 Photo Grid',
      type: 'grid',
      slots: 4,
      thumbnail: '⬛⬛⬛⬛',
      pageCount: 20,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 295, h: 195, radius: 8 },
          { type: 'image', x: 305, y: 0, w: 295, h: 195, radius: 8 },
          { type: 'image', x: 0, y: 205, w: 295, h: 195, radius: 8 },
          { type: 'image', x: 305, y: 205, w: 295, h: 195, radius: 8 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'highlights_6',
      label: 'Highlights',
      type: 'collage',
      slots: 6,
      thumbnail: '📷📷📷',
      pageCount: 30,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 195, h: 130, radius: 8 },
          { type: 'image', x: 205, y: 0, w: 195, h: 130, radius: 8 },
          { type: 'image', x: 410, y: 0, w: 190, h: 130, radius: 8 },
          { type: 'image', x: 0, y: 140, w: 195, h: 130, radius: 8 },
          { type: 'image', x: 205, y: 140, w: 195, h: 130, radius: 8 },
          { type: 'image', x: 410, y: 140, w: 190, h: 130, radius: 8 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'story_1',
      label: 'Story',
      type: 'story',
      slots: 1,
      thumbnail: '📝🖼️',
      pageCount: 40,
      layoutJson: {
        elements: [
          { type: 'image', x: 50, y: 50, w: 500, h: 250, radius: 12 },
          { type: 'text', x: 50, y: 320, text: 'Your Story', fontSize: 24, fontFamily: 'Inter', color: '#1F2937' }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'classic_4',
      label: 'Classic 4',
      type: 'grid',
      slots: 4,
      thumbnail: '📸📸',
      pageCount: 20,
      layoutJson: {
        elements: [
          { type: 'image', x: 20, y: 20, w: 270, h: 175, radius: 4 },
          { type: 'image', x: 310, y: 20, w: 270, h: 175, radius: 4 },
          { type: 'image', x: 20, y: 215, w: 270, h: 175, radius: 4 },
          { type: 'image', x: 310, y: 215, w: 270, h: 175, radius: 4 }
        ]
      },
      bgColor: '#F9FAFB',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'modern_split',
      label: 'Modern Split',
      type: 'split',
      slots: 2,
      thumbnail: '🖼️🖼️',
      pageCount: 30,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 350, h: 400, radius: 0 },
          { type: 'image', x: 360, y: 50, w: 230, h: 300, radius: 12 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'collage_5',
      label: 'Collage 5',
      type: 'collage',
      slots: 5,
      thumbnail: '🎨',
      pageCount: 40,
      layoutJson: {
        elements: [
          { type: 'image', x: 0, y: 0, w: 300, h: 250, radius: 8 },
          { type: 'image', x: 310, y: 0, w: 290, h: 120, radius: 8 },
          { type: 'image', x: 310, y: 130, w: 290, h: 120, radius: 8 },
          { type: 'image', x: 0, y: 260, w: 195, h: 140, radius: 8 },
          { type: 'image', x: 205, y: 260, w: 395, h: 140, radius: 8 }
        ]
      },
      bgColor: '#FFFFFF',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'minimal_2',
      label: 'Minimal',
      type: 'split',
      slots: 2,
      thumbnail: '▪️▪️',
      pageCount: 20,
      layoutJson: {
        elements: [
          { type: 'image', x: 50, y: 50, w: 240, h: 300, radius: 4 },
          { type: 'image', x: 310, y: 50, w: 240, h: 300, radius: 4 }
        ]
      },
      bgColor: '#F3F4F6',
      status: 'active',
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const hasReal = await hasRealData(db.collection('layout_presets'));
  if (hasReal) {
    console.log('📍 layout_presets: Has real data, skipping seed');
    return;
  }

  await db.collection('layout_presets').deleteMany({ _seedData: true });
  await db.collection('layout_presets').insertMany(presets);
  console.log('📍 layout_presets: Collection seeded');
}

async function createTemplateCategories(db) {
  const categories = [
    {
      name: "Wedding",
      description: "Wedding albums",
      status: "active",
      _seedData: true,
      createdAt: new Date()
    },
    {
      name: "Birthday",
      description: "Birthday albums",
      status: "active",
      _seedData: true,
      createdAt: new Date()
    }
  ];

  const hasReal = await hasRealData(db.collection('template_categories'));
  if (hasReal) {
    console.log('📍 template_categories: Has real data, skipping seed');
    return;
  }

  await db.collection('template_categories').deleteMany({ _seedData: true });
  await db.collection('template_categories').insertMany(categories);
  console.log('📍 template_categories: Collection seeded');
}

async function createAlbumTemplates(db) {
  const hasReal = await hasRealData(db.collection('album_templates'));
  if (hasReal) {
    console.log('📍 album_templates: Has real data, skipping seed');
    return;
  }

  const category = await db.collection('template_categories').findOne({ _seedData: true });
  const templates = [
    {
      name: "Royal Wedding Album",
      categoryId: category ? category._id : null,
      pagesCount: 20,
      coverType: "Hard Cover",
      size: "12x12",
      description: "Premium wedding template",
      previewImage: "uploads/template1.jpg",
      status: "active",
      _seedData: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  await db.collection('album_templates').deleteMany({ _seedData: true });
  await db.collection('album_templates').insertMany(templates);
  console.log('📍 album_templates: Collection seeded');
}

// ✅ FIXED: Proper template pages creation
async function createTemplatePages(db) {
  const hasReal = await hasRealData(db.collection('template_pages'));
  if (hasReal) {
    console.log('📍 template_pages: Has real data, skipping seed');
    return;
  }

  // Get the first seed template (not user-created templates)
  const template = await db.collection('album_templates').findOne({ _seedData: true });

  if (!template) {
    console.log('📍 template_pages: No seed template found, skipping');
    return;
  }

  // ✅ FIX: Only create pages for templates that exist
  const pages = [
    {
      templateId: template._id, // ✅ Use actual template ID (not null)
      pageNumber: 1,
      isCover: true,
      layoutJson: {
        elements: [
          { type: "image", x: 100, y: 100, w: 500, h: 400 },
          { type: "text", text: "Wedding Day" }
        ]
      },
      _seedData: true,
      createdAt: new Date()
    },
    {
      templateId: template._id, // ✅ Use actual template ID (not null)
      pageNumber: 2,
      isCover: false,
      layoutJson: {
        elements: [
          { type: "image", x: 50, y: 50, w: 300, h: 200 }
        ]
      },
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('template_pages').deleteMany({ _seedData: true });
  await db.collection('template_pages').insertMany(pages);
  console.log('📍 template_pages: Collection seeded');
}

async function createAlbums(db) {
  const hasReal = await hasRealData(db.collection('albums'));
  if (hasReal) {
    console.log('📍 albums: Has real data, skipping seed');
    return;
  }

  const vendor = await db.collection('vendors').findOne({});
  const template = await db.collection('album_templates').findOne({ _seedData: true });
  
  const albums = [
    {
      vendorId: vendor ? vendor._id : null,
      templateId: template ? template._id : null,
      albumName: "Nethmi Wedding Album",
      customerName: "Nethmi",
      eventDate: new Date(),
      status: "draft",
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('albums').deleteMany({ _seedData: true });
  await db.collection('albums').insertMany(albums);
  console.log('📍 albums: Collection seeded');
}

async function createAlbumPages(db) {
  const hasReal = await hasRealData(db.collection('album_pages'));
  if (hasReal) {
    console.log('📍 album_pages: Has real data, skipping seed');
    return;
  }

  const album = await db.collection('albums').findOne({ _seedData: true });
  
  if (!album) {
    console.log('📍 album_pages: No seed album found, skipping');
    return;
  }

  const pages = [
    {
      albumId: album._id,
      pageNumber: 1,
      layoutJson: {
        elements: [
          { type: "image", x: 100, y: 100, w: 500, h: 400 }
        ]
      },
      images: [],
      _seedData: true,
      updatedAt: new Date()
    }
  ];

  await db.collection('album_pages').deleteMany({ _seedData: true });
  await db.collection('album_pages').insertMany(pages);
  console.log('📍 album_pages: Collection seeded');
}

async function createVendorCollection(db) {
  const hasReal = await hasRealData(db.collection('vendor'));
  if (hasReal) {
    console.log('📍 vendor: Has real data, skipping seed');
    return;
  }

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
      payment_slip: 'slip1.png',
      _seedData: true
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
      payment_slip: 'slip2.png',
      _seedData: true
    }
  ];

  await db.collection('vendor').deleteMany({ _seedData: true });
  await db.collection('vendor').insertMany(vendors);
  console.log('📍 vendor: Collection seeded');
}

async function createAdminCollection(db) {
  const hasReal = await hasRealData(db.collection('admin'));
  if (hasReal) {
    console.log('📍 admin: Has real data, skipping seed');
    return;
  }

  const password = await bcrypt.hash('admin123', 10);
  const admin = {
    id: 1,
    name: 'Super Admin',
    email: 'admin@example.com',
    password,
    _seedData: true,
    created_at: new Date(),
    last_login: null
  };

  await db.collection('admin').deleteMany({ _seedData: true });
  await db.collection('admin').insertOne(admin);
  console.log('📍 admin: Collection seeded');
}

async function createPhotographersCollection(db) {
  const existing = await db.collection('photographers').countDocuments({ _seedData: { $exists: false } });
  if (existing > 0) {
    console.log('📍 photographers: Has real data, skipping seed');
    return;
  }

  console.log('📍 photographers: Collection ready');
}

async function createServiceCategories(db) {
  const hasReal = await hasRealData(db.collection('service_categories'));
  if (hasReal) {
    console.log('📍 service_categories: Has real data, skipping seed');
    return;
  }

  const categories = [
    {
      name: 'Wedding Photography',
      description: 'Professional wedding photography services',
      icon: '📸',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    },
    {
      name: 'Wedding Venue',
      description: 'Wedding venue booking services',
      icon: '🏛️',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    },
    {
      name: 'Catering',
      description: 'Wedding catering and food services',
      icon: '🍽️',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    },
    {
      name: 'Decoration',
      description: 'Wedding decoration and arrangement services',
      icon: '🎉',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('service_categories').deleteMany({ _seedData: true });
  await db.collection('service_categories').insertMany(categories);
  console.log('📍 service_categories: Collection seeded');
}

async function createSubPlanCollection(db) {
  const hasReal = await hasRealData(db.collection('sub_plan'));
  if (hasReal) {
    console.log('📍 sub_plan: Has real data, skipping seed');
    return;
  }

  const plans = [
    {
      name: 'Basic Service',
      price: 5000,
      duration: 30,
      features: ['5 Listings', 'Basic Support', 'Standard Visibility'],
      vendorType: 'service',
      description: 'Perfect for getting started',
      status: 'active',
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('sub_plan').deleteMany({ _seedData: true });
  await db.collection('sub_plan').insertMany(plans);
  console.log('📍 sub_plan: Collection seeded');
}

async function createVendorsCollection(db) {
  const hasReal = await hasRealData(db.collection('vendors'));
  if (hasReal) {
    console.log('📍 vendors: Has real data, skipping seed');
    return;
  }

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
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('vendors').deleteMany({ _seedData: true });
  await db.collection('vendors').insertMany(dummyVendors);
  console.log('📍 vendors: Collection seeded');
}

async function createAlbumVendorsCollection(db) {
  const hasReal = await hasRealData(db.collection('album_vendors'));
  if (hasReal) {
    console.log('📍 album_vendors: Has real data, skipping seed');
    return;
  }

  const albumVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Royal Album Studio',
      profilePic: 'uploads/album_vendors/studio1.jpg',
      whatsappNo: '+94712345678',
      slipPhoto: 'uploads/slips/slip_album_1.jpg',
      status: 'approved',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Wedding Memories Albums',
      profilePic: 'uploads/album_vendors/studio2.jpg',
      whatsappNo: '+94723456789',
      slipPhoto: 'uploads/slips/slip_album_2.jpg',
      status: 'approved',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Premium Photo Albums',
      profilePic: 'uploads/album_vendors/studio3.jpg',
      whatsappNo: '+94734567890',
      slipPhoto: 'uploads/slips/slip_album_3.jpg',
      status: 'pending',
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('album_vendors').deleteMany({ _seedData: true });
  await db.collection('album_vendors').insertMany(albumVendors);
  console.log('📍 album_vendors: Collection seeded');
}

async function createServiceVendorsCollection(db) {
  const hasReal = await hasRealData(db.collection('service_vendors'));
  if (hasReal) {
    console.log('📍 service_vendors: Has real data, skipping seed');
    return;
  }

  const serviceVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      whatsappNo: '+94712111222',
      profilePic: 'uploads/service_vendors/service1.jpg',
      slipPhoto: 'uploads/slips/slip_service_1.jpg',
      selectedServices: ['Wedding Photography', 'Wedding Venue'],
      status: 'approved',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      whatsappNo: '+94723222333',
      profilePic: 'uploads/service_vendors/service2.jpg',
      slipPhoto: 'uploads/slips/slip_service_2.jpg',
      selectedServices: ['Catering', 'Decoration'],
      status: 'approved',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      whatsappNo: '+94734333444',
      profilePic: 'uploads/service_vendors/service3.jpg',
      slipPhoto: 'uploads/slips/slip_service_3.jpg',
      selectedServices: ['Wedding Photography', 'Music Band', 'Catering'],
      status: 'pending',
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('service_vendors').deleteMany({ _seedData: true });
  await db.collection('service_vendors').insertMany(serviceVendors);
  console.log('📍 service_vendors: Collection seeded');
}

async function createProductVendorsCollection(db) {
  const hasReal = await hasRealData(db.collection('product_vendors'));
  if (hasReal) {
    console.log('📍 product_vendors: Has real data, skipping seed');
    return;
  }

  const productVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      companyName: 'Royal Wedding Gifts',
      logoPic: 'uploads/product_vendors/logo1.jpg',
      description: 'Premium wedding gifts and souvenirs for your special day',
      whatsappNo: '+94712444555',
      slipPhoto: 'uploads/slips/slip_product_1.jpg',
      status: 'approved',
      _seedData: true,
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
      _seedData: true,
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
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('product_vendors').deleteMany({ _seedData: true });
  await db.collection('product_vendors').insertMany(productVendors);
  console.log('📍 product_vendors: Collection seeded');
}

async function createProposalVendorsCollection(db) {
  const hasReal = await hasRealData(db.collection('proposal_vendors'));
  if (hasReal) {
    console.log('📍 proposal_vendors: Has real data, skipping seed');
    return;
  }

  const proposalVendors = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'John Smith - Proposal Expert',
      profilePic: 'uploads/proposal_vendors/artist1.jpg',
      whatsappNo: '+94712777888',
      slipPhoto: 'uploads/slips/slip_proposal_1.jpg',
      status: 'approved',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Romantic Moments Events',
      profilePic: 'uploads/proposal_vendors/artist2.jpg',
      whatsappNo: '+94723888999',
      slipPhoto: 'uploads/slips/slip_proposal_2.jpg',
      status: 'approved',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      name: 'Love Story Planners',
      profilePic: 'uploads/proposal_vendors/artist3.jpg',
      whatsappNo: '+94734999000',
      slipPhoto: 'uploads/slips/slip_proposal_3.jpg',
      status: 'pending',
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('proposal_vendors').deleteMany({ _seedData: true });
  await db.collection('proposal_vendors').insertMany(proposalVendors);
  console.log('📍 proposal_vendors: Collection seeded');
}

async function createVendorServicesCollection(db) {
  const hasReal = await hasRealData(db.collection('vendor_services'));
  if (hasReal) {
    console.log('📍 vendor_services: Has real data, skipping seed');
    return;
  }

  const vendorServices = [
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      service_id: 'Wedding Photography',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      service_id: 'Catering',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    },
    {
      vendor_id: new (require('mongodb')).ObjectId(),
      service_id: 'Music Band',
      status: 'active',
      _seedData: true,
      createdAt: new Date()
    }
  ];

  await db.collection('vendor_services').deleteMany({ _seedData: true });
  await db.collection('vendor_services').insertMany(vendorServices);
  console.log('📍 vendor_services: Collection seeded');
}

// ============================================================
// MAIN FUNCTION
// ============================================================

async function main() {
  const client = new MongoClient(uri, {
    tls: true,
    tlsInsecure: true,
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    minPoolSize: 1,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    const db = client.db(dbName);

    // Ensure all collections exist
    console.log('📦 Creating/Ensuring collections...');
    for (const name of collections) {
      await db.createCollection(name).catch(() => {});
    }
    console.log('✅ All collections ready\n');

    // Create indexes
    console.log('🔑 Setting up indexes...');
    
    // template_pages: unique on (templateId, pageNumber) - but NOT for null templateId
    await createIndexSafely(
      db.collection('template_pages'),
      { templateId: 1, pageNumber: 1 },
      {
        unique: true,
        sparse: true,  // ✅ This ignores documents where templateId is null
        partialFilterExpression: {
          templateId: { $type: 'objectId' } // Only index documents with valid ObjectId
        },
        name: 'templateId_1_pageNumber_1'
      }
    );

    // album_pages: unique on (albumId, pageNumber)
    await createIndexSafely(
      db.collection('album_pages'),
      { albumId: 1, pageNumber: 1 },
      { 
        unique: true,
        sparse: true,
        name: 'albumId_1_pageNumber_1'
      }
    );

    // album_page_slots: unique on (albumPageId, slotKey)
    await createIndexSafely(
      db.collection('album_page_slots'),
      { albumPageId: 1, slotKey: 1 },
      { 
        unique: true,
        sparse: true,
        name: 'albumPageId_1_slotKey_1'
      }
    );

    // Photographer/User/Album Scenario Indexes
    await createIndexSafely(
      db.collection('photographers'),
      { email: 1 },
      { unique: true, sparse: true, name: 'email_1' }
    );

    await createIndexSafely(
      db.collection('users'),
      { email: 1 },
      { unique: true, sparse: true, name: 'email_1' }
    );

    await createIndexSafely(
      db.collection('albums'),
      { shareToken: 1 },
      { unique: true, sparse: true, name: 'shareToken_1' }
    );

    await createIndexSafely(
      db.collection('albums'),
      { photographer_id: 1 },
      { name: 'photographer_id_1' }
    );

    await createIndexSafely(
      db.collection('albums'),
      { 'coupleAccess.email': 1 },
      { name: 'coupleAccess.email_1' }
    );

    console.log('✅ All indexes created\n');

    // Seed collections
    console.log('🌱 Seeding collections...');
    await createServiceCategories(db);
    await createSubPlanCollection(db);
    await createVendorCollection(db);
    await createAdminCollection(db);
    await createPhotographersCollection(db);
    await createServicesCollection(db);
    await createVendorsCollection(db);
    await createAlbumVendorsCollection(db);
    await createServiceVendorsCollection(db);
    await createProductVendorsCollection(db);
    await createProposalVendorsCollection(db);
    await createVendorServicesCollection(db);

    // Album Template System
    await createLayoutPresets(db);
    await createTemplateCategories(db);
    await createAlbumTemplates(db);
    await createTemplatePages(db);
    await createAlbums(db);
    await createAlbumPages(db);

    console.log('\n✅ All collections seeded successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();