const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get all products (public)
router.get('/', async (req, res) => {
  const db = getDb();
  const { category_id, vendor_id, sort, limit = 20, skip = 0 } = req.query;
  
  const filter = { status: 'active' };
  if (category_id) filter.category_id = new ObjectId(category_id);
  if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);
  
  let sortOption = { created_at: -1 };
  if (sort === 'price_asc') sortOption = { price: 1 };
  if (sort === 'price_desc') sortOption = { price: -1 };
  if (sort === 'name') sortOption = { product_name: 1 };
  
  const products = await db.collection('vendor_products').aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'product_categories',
        localField: 'category_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $lookup: {
        from: 'vendor_profiles',
        localField: 'vendor_id',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $sort: sortOption },
    { $skip: parseInt(skip) },
    { $limit: parseInt(limit) }
  ]).toArray();
  
  const total = await db.collection('vendor_products').countDocuments(filter);
  
  res.json({ products, total, limit: parseInt(limit), skip: parseInt(skip) });
});

// Get product categories
router.get('/categories', async (req, res) => {
  const db = getDb();
  
  const categories = await db.collection('product_categories').find({
    status: 'active'
  }).toArray();
  
  res.json({ categories });
});

// Get vendors with products
router.get('/vendors', async (req, res) => {
  const db = getDb();
  
  const vendors = await db.collection('vendor_profiles').aggregate([
    { $match: { approval_status: 'approved' } },
    {
      $lookup: {
        from: 'vendor_types',
        localField: 'vendor_type_id',
        foreignField: '_id',
        as: 'vendor_type'
      }
    },
    {
      $lookup: {
        from: 'vendor_products',
        localField: '_id',
        foreignField: 'vendor_id',
        as: 'products'
      }
    },
    {
      $addFields: {
        product_count: { $size: '$products' }
      }
    },
    { $match: { product_count: { $gt: 0 } } },
    { $project: { products: 0 } }
  ]).toArray();
  
  res.json({ vendors });
});

module.exports = router;
