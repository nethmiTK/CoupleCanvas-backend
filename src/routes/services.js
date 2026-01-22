const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
  const db = getDb();
  const { category, vendor_id } = req.query;
  
  const filter = {};
  if (category) filter.category = category;
  
  let services;
  if (vendor_id) {
    services = await db.collection('vendor_services_albums').aggregate([
      { $match: { vendor_id: new ObjectId(vendor_id) } },
      {
        $lookup: {
          from: 'services',
          localField: 'service_id',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' }
    ]).toArray();
  } else {
    services = await db.collection('services').find(filter).toArray();
  }
  
  res.json({ services });
});

// Create service
router.post('/', async (req, res) => {
  const db = getDb();
  const { name, image, category } = req.body;
  
  const result = await db.collection('services').insertOne({
    name,
    image,
    category,
    created_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Service created successfully',
    serviceId: result.insertedId 
  });
});

// Get vendor services
router.get('/vendor-services', async (req, res) => {
  const db = getDb();
  const { vendor_id, service_id } = req.query;
  
  const filter = { vendor_id: new ObjectId(vendor_id) };
  if (service_id) filter.service_id = new ObjectId(service_id);
  
  const vendorServices = await db.collection('vendor_services_albums').aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'services',
        localField: 'service_id',
        foreignField: '_id',
        as: 'service'
      }
    },
    { $unwind: '$service' }
  ]).toArray();
  
  res.json({ vendorServices });
});

// Create vendor service
router.post('/vendor-services', async (req, res) => {
  const db = getDb();
  const { vendor_id, service_id, template_id } = req.body;
  
  const result = await db.collection('vendor_services_albums').insertOne({
    vendor_id: new ObjectId(vendor_id),
    service_id: new ObjectId(service_id),
    template_id: template_id ? new ObjectId(template_id) : null,
    created_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Vendor service created successfully',
    id: result.insertedId 
  });
});

// Delete vendor service
router.delete('/vendor-services', async (req, res) => {
  const db = getDb();
  const { id } = req.query;
  
  await db.collection('vendor_services_albums').deleteOne({
    _id: new ObjectId(id)
  });
  
  res.json({ message: 'Vendor service deleted successfully' });
});

// Get service posts
router.get('/posts', async (req, res) => {
  const db = getDb();
  const { vendor_id, service_id } = req.query;
  
  const filter = {};
  if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);
  if (service_id) filter.service_id = new ObjectId(service_id);
  
  const posts = await db.collection('service_posts').aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'services',
        localField: 'service_id',
        foreignField: '_id',
        as: 'service'
      }
    },
    {
      $lookup: {
        from: 'vendor_profiles',
        localField: 'vendor_id',
        foreignField: '_id',
        as: 'vendor'
      }
    }
  ]).toArray();
  
  res.json({ posts });
});

// Create service post
router.post('/posts', async (req, res) => {
  const db = getDb();
  const { vendor_id, service_id, media_url, caption, description, price } = req.body;
  
  const result = await db.collection('service_posts').insertOne({
    vendor_id: new ObjectId(vendor_id),
    service_id: new ObjectId(service_id),
    media_url,
    caption,
    description,
    price: price ? parseFloat(price) : null,
    created_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Post created successfully',
    postId: result.insertedId 
  });
});

// Delete service post
router.delete('/posts', async (req, res) => {
  const db = getDb();
  const { post_id } = req.query;
  
  await db.collection('service_posts').deleteOne({
    _id: new ObjectId(post_id)
  });
  
  res.json({ message: 'Post deleted successfully' });
});

module.exports = router;
