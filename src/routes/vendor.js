const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure profile uploads directory exists
const profileUploadsDir = path.join(__dirname, '../../public/uploads/profiles');
if (!fs.existsSync(profileUploadsDir)) {
  fs.mkdirSync(profileUploadsDir, { recursive: true });
}

// Multer config for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const uploadProfileImage = multer({ storage: profileStorage });

// Complete vendor registration
router.post('/register', async (req, res) => {
  const db = getDb();
  const {
    user_id,
    business_name,
    address,
    city,
    vendor_type_id,
    membership_package,
    payment_info
  } = req.body;

  const result = await db.collection('vendor_profiles').insertOne({
    user_id: new ObjectId(user_id),
    business_name,
    address,
    city,
    vendor_type_id,
    membership_package,
    approval_status: 'pending',
    expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    created_at: new Date(),
    updated_at: new Date()
  });

  res.status(201).json({
    message: 'Vendor registered successfully',
    vendorId: result.insertedId
  });
});

// Get vendor profile by query param
router.get('/profile', async (req, res) => {
  const db = getDb();
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const profile = await db.collection('vendor_profiles').aggregate([
      { $match: { user_id: new ObjectId(user_id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    res.json({ profile: profile[0] || null });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get vendor profile by vendor_id path param
router.get('/profile/:vendor_id', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.params;

  if (!ObjectId.isValid(vendor_id)) {
    return res.status(400).json({ error: 'Invalid vendor_id' });
  }

  const vendorObjectId = new ObjectId(vendor_id);

  try {
    // Legacy profile collection (if present)
    const legacyProfile = await db.collection('vendor_profiles').findOne({
      $or: [
        { _id: vendorObjectId },
        { vendor_id: vendorObjectId },
        { vendor_id: vendor_id }
      ]
    });

    // Main auth vendor record
    const vendorAccount = await db.collection('vendors').findOne({ _id: vendorObjectId });

    // Type-specific vendor details for phone/name/profile image
    const [proposalVendor, albumVendor, serviceVendor, productVendor] = await Promise.all([
      db.collection('proposal_vendors').findOne({
        $or: [{ vendor_id: vendorObjectId }, { vendor_id: vendor_id }]
      }),
      db.collection('album_vendors').findOne({
        $or: [{ vendor_id: vendorObjectId }, { vendor_id: vendor_id }]
      }),
      db.collection('service_vendors').findOne({
        $or: [{ vendor_id: vendorObjectId }, { vendor_id: vendor_id }]
      }),
      db.collection('product_vendors').findOne({
        $or: [{ vendor_id: vendorObjectId }, { vendor_id: vendor_id }]
      })
    ]);

    const typedVendor = proposalVendor || albumVendor || serviceVendor || productVendor || null;
    const typedName = typedVendor?.name || typedVendor?.companyName || '';
    const typedPhone = typedVendor?.whatsappNo || '';
    const typedImage = typedVendor?.profilePic || typedVendor?.logoPic || '';

    return res.json({
      _id: vendor_id,
      name: typedName || vendorAccount?.username || vendorAccount?.name || legacyProfile?.business_name || '',
      email: vendorAccount?.email || legacyProfile?.email || '',
      phone: typedPhone || vendorAccount?.phone || legacyProfile?.phone || '',
      whatsappNo: typedPhone || vendorAccount?.phone || legacyProfile?.phone || '',
      address: legacyProfile?.address || vendorAccount?.address || '',
      business_name: legacyProfile?.business_name || '',
      business_type: legacyProfile?.vendor_type_id || '',
      description: legacyProfile?.description || '',
      profile_image: typedImage || legacyProfile?.profile_image || '',
      social_links: legacyProfile?.social_links || {},
      created_at: legacyProfile?.created_at || vendorAccount?.createdAt || null
    });
  } catch (err) {
    console.error('Error fetching vendor profile:', err);
    res.status(500).json({ error: 'Failed to fetch vendor profile' });
  }
});

// Update vendor profile
router.put('/profile/:vendor_id', uploadProfileImage.single('profile_image'), async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.params;
  const {
    name, phone, address,
    business_name, business_type, description,
    wedding_date
  } = req.body;

  // Parse social_links if it's a string
  let social_links = req.body.social_links;
  if (typeof social_links === 'string') {
    try {
      social_links = JSON.parse(social_links);
    } catch {
      social_links = {};
    }
  }

  // Get profile image path if uploaded
  let profile_image = req.body.profile_image_existing;
  if (req.file) {
    profile_image = `/uploads/profiles/${req.file.filename}`;
  }

  if (!ObjectId.isValid(vendor_id)) {
    return res.status(400).json({ error: 'Invalid vendor_id' });
  }

  const vendorObjectId = new ObjectId(vendor_id);

  try {
    // Keep legacy vendor_profiles in sync for old screens.
    await db.collection('vendor_profiles').updateOne(
      { _id: vendorObjectId },
      {
        $set: {
          business_name: business_name || '',
          address: address || '',
          description: description || '',
          phone: phone || '',
          profile_image: profile_image || '',
          social_links: social_links || {},
          vendor_type_id: business_type || '',
          wedding_date: wedding_date ? new Date(wedding_date) : null,
          updated_at: new Date()
        }
      },
      { upsert: true }
    );

    // Update main vendor auth/account record.
    const vendorUpdate = { updatedAt: new Date() };
    if (name) {
      vendorUpdate.username = name;
      vendorUpdate.name = name;
    }
    if (phone !== undefined) {
      vendorUpdate.phone = phone;
    }
    await db.collection('vendors').updateOne(
      { _id: vendorObjectId },
      { $set: vendorUpdate }
    );

    // Update type-specific vendor records used by admin/vendor flows.
    const typeBaseUpdate = {
      updatedAt: new Date()
    };
    if (name) {
      typeBaseUpdate.name = name;
      typeBaseUpdate.companyName = name;
    }
    if (phone !== undefined) {
      typeBaseUpdate.whatsappNo = phone;
      typeBaseUpdate.phone = phone;
    }

    if (profile_image) {
      typeBaseUpdate.profilePic = profile_image;
      typeBaseUpdate.logoPic = profile_image;
    }

    const typeFilter = {
      $or: [{ vendor_id: vendorObjectId }, { vendor_id: vendor_id }]
    };

    await Promise.all([
      db.collection('proposal_vendors').updateMany(typeFilter, { $set: typeBaseUpdate }),
      db.collection('album_vendors').updateMany(typeFilter, { $set: typeBaseUpdate }),
      db.collection('service_vendors').updateMany(typeFilter, { $set: typeBaseUpdate }),
      db.collection('product_vendors').updateMany(typeFilter, { $set: typeBaseUpdate })
    ]);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get vendor status
router.get('/status', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.query;

  const vendor = await db.collection('vendor_profiles').findOne(
    { _id: new ObjectId(vendor_id) },
    { projection: { approval_status: 1 } }
  );

  res.json({ status: vendor?.approval_status || 'not_found' });
});

// Get vendor service
router.get('/service', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.query;

  const service = await db.collection('vendor_services_albums').findOne({
    vendor_id: new ObjectId(vendor_id)
  });

  res.json({ service });
});

// Vendor products CRUD
router.get('/product', async (req, res) => {
  const db = getDb();
  const { vendor_id, category_id } = req.query;

  const filter = { vendor_id: new ObjectId(vendor_id) };
  if (category_id) filter.category_id = new ObjectId(category_id);

  const products = await db.collection('vendor_products').aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'product_categories',
        localField: 'category_id',
        foreignField: '_id',
        as: 'category'
      }
    }
  ]).toArray();

  res.json({ products });
});

router.post('/product', async (req, res) => {
  const db = getDb();
  const {
    vendor_id,
    category_id,
    product_name,
    description,
    price,
    stock_quantity,
    images
  } = req.body;

  const result = await db.collection('vendor_products').insertOne({
    vendor_id: new ObjectId(vendor_id),
    category_id: new ObjectId(category_id),
    product_name,
    description,
    price: parseFloat(price),
    stock_quantity: parseInt(stock_quantity),
    images: images || [],
    status: 'active',
    created_at: new Date(),
    updated_at: new Date()
  });

  res.status(201).json({
    message: 'Product created successfully',
    productId: result.insertedId
  });
});

router.put('/product', async (req, res) => {
  const db = getDb();
  const { product_id, ...updateFields } = req.body;

  if (updateFields.price) updateFields.price = parseFloat(updateFields.price);
  if (updateFields.stock_quantity) updateFields.stock_quantity = parseInt(updateFields.stock_quantity);
  updateFields.updated_at = new Date();

  await db.collection('vendor_products').updateOne(
    { _id: new ObjectId(product_id) },
    { $set: updateFields }
  );

  res.json({ message: 'Product updated successfully' });
});

router.delete('/product', async (req, res) => {
  const db = getDb();
  const { product_id } = req.query;

  await db.collection('vendor_products').deleteOne({
    _id: new ObjectId(product_id)
  });

  res.json({ message: 'Product deleted successfully' });
});

// Vendor proposals CRUD
router.get('/proposal', async (req, res) => {
  const db = getDb();
  const { vendor_id, gender_type } = req.query;

  const filter = { vendor_id: new ObjectId(vendor_id) };
  if (gender_type) filter.gender_type = gender_type;

  const proposals = await db.collection('vendor_proposal').find(filter).toArray();
  res.json({ proposals });
});

router.post('/proposal', async (req, res) => {
  const db = getDb();
  const {
    vendor_id,
    gender_type,
    description,
    images,
    min_price,
    max_price
  } = req.body;

  const result = await db.collection('vendor_proposal').insertOne({
    vendor_id: new ObjectId(vendor_id),
    gender_type,
    description,
    images: images || [],
    min_price: parseFloat(min_price),
    max_price: parseFloat(max_price),
    created_at: new Date()
  });

  res.status(201).json({
    message: 'Proposal created successfully',
    proposalId: result.insertedId
  });
});

router.put('/proposal', async (req, res) => {
  const db = getDb();
  const { proposal_id, ...updateFields } = req.body;

  if (updateFields.min_price) updateFields.min_price = parseFloat(updateFields.min_price);
  if (updateFields.max_price) updateFields.max_price = parseFloat(updateFields.max_price);

  await db.collection('vendor_proposal').updateOne(
    { _id: new ObjectId(proposal_id) },
    { $set: updateFields }
  );

  res.json({ message: 'Proposal updated successfully' });
});

router.delete('/proposal', async (req, res) => {
  const db = getDb();
  const { proposal_id } = req.query;

  await db.collection('vendor_proposal').deleteOne({
    _id: new ObjectId(proposal_id)
  });

  res.json({ message: 'Proposal deleted successfully' });
});

// Album templates CRUD
router.get('/template', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.query;

  const templates = await db.collection('vendor_album_template').find({
    vendor_id: new ObjectId(vendor_id)
  }).toArray();

  res.json({ templates });
});

router.post('/template', async (req, res) => {
  const db = getDb();
  const { vendor_id, template_name, cover_image } = req.body;

  const result = await db.collection('vendor_album_template').insertOne({
    vendor_id: new ObjectId(vendor_id),
    template_name,
    cover_image,
    status: 'active',
    created_at: new Date()
  });

  res.status(201).json({
    message: 'Template created successfully',
    templateId: result.insertedId
  });
});

router.put('/template', async (req, res) => {
  const db = getDb();
  const { template_id, status } = req.body;

  await db.collection('vendor_album_template').updateOne(
    { _id: new ObjectId(template_id) },
    { $set: { status } }
  );

  res.json({ message: 'Template updated successfully' });
});

router.delete('/template', async (req, res) => {
  const db = getDb();
  const { template_id } = req.query;

  await db.collection('vendor_album_template').deleteOne({
    _id: new ObjectId(template_id)
  });

  res.json({ message: 'Template deleted successfully' });
});

// Videos CRUD
router.get('/video', async (req, res) => {
  try {
    const db = getDb();
    const { vendor_id } = req.query;

    console.log(`📡 GET /vendor/video - vendor_id: ${vendor_id}`);

    if (!db) {
      console.error('❌ Database connection not available');
      return res.status(503).json({ 
        error: 'Database connection unavailable', 
        videos: [] 
      });
    }

    if (!vendor_id) {
      const errorResponse = { error: 'vendor_id is required', videos: [] };
      console.warn('⚠️ vendor_id missing:', errorResponse);
      return res.status(400).json(errorResponse);
    }

    // Validate vendor_id format
    let query = {};
    if (ObjectId.isValid(vendor_id)) {
      query = { vendor_id: new ObjectId(vendor_id) };
      console.log(`✅ vendor_id is valid ObjectId`);
    } else {
      // If not a valid ObjectId, try to find by string
      query = { vendor_id: vendor_id };
      console.log(`⚠️ vendor_id is not ObjectId format, querying as string`);
    }

    console.log(`🔍 Querying collection with:`, JSON.stringify(query));
    const videos = await db.collection('vendor_video').find(query).sort({ created_at: -1 }).toArray();
    
    console.log(`✅ Found ${videos.length} videos`);
    return res.status(200).json({ videos });
  } catch (err) {
    console.error('❌ Error fetching videos:', err);
    console.error('   Stack:', err.stack);
    const errorResponse = { 
      error: err.message || 'Failed to fetch videos',
      cause: err.name,
      videos: [] 
    };
    return res.status(500).json(errorResponse);
  }
});

// Public videos - get all available videos
router.get('/video/public', async (req, res) => {
  const db = getDb();

  try {
    const videos = await db.collection('vendor_video').find({
      availability: true
    }).sort({ created_at: -1 }).toArray();

    res.json({ videos });
  } catch (err) {
    console.error('Error fetching public videos:', err);
    res.status(500).json({ error: 'Failed to fetch videos', videos: [] });
  }
});

router.post('/video', async (req, res) => {
  const db = getDb();
  const { vendor_id, video_url, thumbnail, title, description } = req.body;

  if (!vendor_id || !video_url || !title) {
    return res.status(400).json({ error: 'vendor_id, video_url and title are required' });
  }

  try {
    // Ensure vendor_id is properly formatted as ObjectId
    let vendorObjectId = vendor_id;
    if (ObjectId.isValid(vendor_id)) {
      vendorObjectId = new ObjectId(vendor_id);
    }

    const result = await db.collection('vendor_video').insertOne({
      vendor_id: vendorObjectId,
      video_url,
      thumbnail: thumbnail || '',
      title,
      description: description || '',
      availability: true,
      created_at: new Date()
    });

    res.status(201).json({
      message: 'Video created successfully',
      videoId: result.insertedId
    });
  } catch (err) {
    console.error('Error creating video:', err);
    res.status(500).json({ error: `Failed to create video: ${err.message}` });
  }
});

router.put('/video', async (req, res) => {
  const db = getDb();
  const { video_id, availability } = req.body;

  if (!video_id) {
    return res.status(400).json({ error: 'video_id is required' });
  }

  try {
    // Validate video_id format
    if (!ObjectId.isValid(video_id)) {
      return res.status(400).json({ error: 'Invalid video_id format' });
    }

    await db.collection('vendor_video').updateOne(
      { _id: new ObjectId(video_id) },
      { $set: { availability, updated_at: new Date() } }
    );

    res.json({ message: 'Video updated successfully' });
  } catch (err) {
    console.error('Error updating video:', err);
    res.status(500).json({ error: `Failed to update video: ${err.message}` });
  }
});

router.delete('/video', async (req, res) => {
  const db = getDb();
  const { video_id } = req.query;

  if (!video_id) {
    return res.status(400).json({ error: 'video_id is required' });
  }

  try {
    // Validate video_id format
    if (!ObjectId.isValid(video_id)) {
      return res.status(400).json({ error: 'Invalid video_id format' });
    }

    const result = await db.collection('vendor_video').deleteOne({
      _id: new ObjectId(video_id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    console.error('Error deleting video:', err);
    res.status(500).json({ error: `Failed to delete video: ${err.message}` });
  }
});

// Vendor settings
router.get('/settings', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.query;

  let settings = await db.collection('vendor_settings').findOne({
    vendor_id: new ObjectId(vendor_id)
  });

  if (!settings) {
    // Return default settings
    settings = {
      vendor_id: vendor_id,
      business_hours: {},
      notifications_enabled: true,
      social_media: {}
    };
  }

  res.json({ settings });
});

router.post('/settings', async (req, res) => {
  const db = getDb();
  const { vendor_id, ...settings } = req.body;

  await db.collection('vendor_settings').updateOne(
    { vendor_id: new ObjectId(vendor_id) },
    { $set: { ...settings, updated_at: new Date() } },
    { upsert: true }
  );

  res.json({ message: 'Settings updated successfully' });
});

// Vendor subscription
router.post('/subscribe', async (req, res) => {
  const db = getDb();
  try {
    const { vendorId, vendorType, planId, planName, planDuration, amount, paymentSlip, status } = req.body;

    if (!vendorId || !vendorType || !planName) {
      return res.status(400).json({ error: 'vendorId, vendorType, and planName are required' });
    }

    const subscription = {
      vendorId: new ObjectId(vendorId),
      vendorType,
      planId,
      planName,
      planDuration: planDuration || 30, // Default to 30 if not specified
      amount: amount || 0,
      paymentSlip: paymentSlip || null,
      status: status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if subscription already exists
    const existing = await db.collection('vendor_subscriptions').findOne({
      vendorId: new ObjectId(vendorId),
      vendorType
    });

    if (existing) {
      await db.collection('vendor_subscriptions').updateOne(
        { _id: existing._id },
        { $set: { ...subscription, updatedAt: new Date() } }
      );
      return res.json({ message: 'Subscription updated', subscriptionId: existing._id });
    }

    const result = await db.collection('vendor_subscriptions').insertOne(subscription);

    // If free plan (status: active), update vendor status
    if (status === 'active') {
      await db.collection('vendors').updateOne(
        { _id: new ObjectId(vendorId) },
        { $set: { status: 'approved', subscriptionPlan: planName, updatedAt: new Date() } }
      );
    }

    res.status(201).json({
      message: 'Subscription created',
      subscriptionId: result.insertedId,
      status
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get vendor subscription status
router.get('/subscription/:vendorId', async (req, res) => {
  const db = getDb();
  try {
    const { vendorId } = req.params;
    const { vendorType } = req.query;

    const query = { vendorId: new ObjectId(vendorId) };
    if (vendorType) query.vendorType = vendorType;

    const subscriptions = await db.collection('vendor_subscriptions').aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          planObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$planId", null] }, { $ne: ["$planId", ""] }] },
              then: { $toObjectId: "$planId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'sub_plan',
          localField: 'planObjectId',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      { $unwind: { path: '$planDetails', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          planDuration: { $ifNull: ["$planDuration", "$planDetails.duration", 30] }
        }
      },
      { $project: { planDetails: 0, planObjectId: 0 } }
    ]).toArray();

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all pending subscriptions
router.get('/subscriptions/pending', async (req, res) => {
  const db = getDb();
  try {
    const subscriptions = await db.collection('vendor_subscriptions')
      .aggregate([
        { $match: { status: 'pending' } },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get pending subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve/Reject subscription
router.patch('/subscription/:id/status', async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'rejected'

    const subscription = await db.collection('vendor_subscriptions').findOne({
      _id: new ObjectId(id)
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await db.collection('vendor_subscriptions').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    // If approved (active), update the vendor's status in their respective collection
    if (status === 'active') {
      // Update in generic vendors collection (legacy)
      await db.collection('vendors').updateOne(
        { _id: subscription.vendorId },
        {
          $set: {
            status: 'approved',
            subscriptionPlan: subscription.planName,
            updatedAt: new Date()
          }
        }
      );

      // Also update album_vendors or proposal_vendors status -> 'active'
      if (subscription.vendorType === 'album') {
        await db.collection('album_vendors').updateOne(
          {
            $or: [
              { _id: subscription.vendorId },
              { vendor_id: subscription.vendorId }
            ]
          },
          { $set: { status: 'active', updatedAt: new Date() } }
        );
      } else if (subscription.vendorType === 'proposal') {
        await db.collection('proposal_vendors').updateOne(
          {
            $or: [
              { _id: subscription.vendorId },
              { vendor_id: subscription.vendorId }
            ]
          },
          { $set: { status: 'active', updatedAt: new Date() } }
        );
      }
    }

    res.json({ message: `Subscription ${status}`, subscriptionId: id });
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint for debugging
router.get('/health', (req, res) => {
  const db = getDb();
  const isDbConnected = db !== null && db !== undefined;
  
  res.json({
    status: 'ok',
    message: 'Vendor API is running',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get vendor by ID (MUST be last to avoid catching specific routes like /video, /status, etc.)
router.get('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid vendor ID format' });
  }

  const vendor = await db.collection('vendor_profiles').aggregate([
    { $match: { _id: new ObjectId(id) } },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $lookup: {
        from: 'vendor_services_albums',
        localField: '_id',
        foreignField: 'vendor_id',
        as: 'services'
      }
    }
  ]).toArray();

  res.json({ vendor: vendor[0] || null });
});

module.exports = router;
