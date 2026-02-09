const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

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

// Get vendor profile
router.get('/profile', async (req, res) => {
  const db = getDb();
  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  
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
    { $unwind: '$user' }
  ]).toArray();
  
  res.json({ profile: profile[0] || null });
});

// Get vendor by ID
router.get('/:id', async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  
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
  const db = getDb();
  const { vendor_id } = req.query;
  
  const videos = await db.collection('vendor_video').find({
    vendor_id: new ObjectId(vendor_id)
  }).toArray();
  
  res.json({ videos });
});

router.post('/video', async (req, res) => {
  const db = getDb();
  const { vendor_id, video_url, thumbnail, title, description } = req.body;
  
  const result = await db.collection('vendor_video').insertOne({
    vendor_id: new ObjectId(vendor_id),
    video_url,
    thumbnail,
    title,
    description,
    availability: true,
    created_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Video created successfully',
    videoId: result.insertedId 
  });
});

router.put('/video', async (req, res) => {
  const db = getDb();
  const { video_id, availability } = req.body;
  
  await db.collection('vendor_video').updateOne(
    { _id: new ObjectId(video_id) },
    { $set: { availability } }
  );
  
  res.json({ message: 'Video updated successfully' });
});

router.delete('/video', async (req, res) => {
  const db = getDb();
  const { video_id } = req.query;
  
  await db.collection('vendor_video').deleteOne({
    _id: new ObjectId(video_id)
  });
  
  res.json({ message: 'Video deleted successfully' });
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
    const { vendorId, vendorType, planId, planName, amount, paymentSlip, status } = req.body;
    
    if (!vendorId || !vendorType || !planName) {
      return res.status(400).json({ error: 'vendorId, vendorType, and planName are required' });
    }

    const subscription = {
      vendorId: new ObjectId(vendorId),
      vendorType,
      planId,
      planName,
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

    const subscriptions = await db.collection('vendor_subscriptions')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

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

    // If approved, update vendor status
    if (status === 'active') {
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
    }

    res.json({ message: `Subscription ${status}`, subscriptionId: id });
  } catch (error) {
    console.error('Update subscription status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
