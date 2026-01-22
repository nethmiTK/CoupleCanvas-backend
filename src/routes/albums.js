const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get all albums
router.get('/', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.query;
  
  const filter = {};
  if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);
  
  const albums = await db.collection('albums').aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'vendor_profiles',
        localField: 'vendor_id',
        foreignField: '_id',
        as: 'vendor'
      }
    },
    { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } }
  ]).toArray();
  
  res.json({ albums });
});

// Create album
router.post('/', async (req, res) => {
  const db = getDb();
  const { vendor_id, template_id, title, description } = req.body;
  
  const result = await db.collection('albums').insertOne({
    vendor_id: new ObjectId(vendor_id),
    template_id: new ObjectId(template_id),
    title,
    description,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Album created successfully',
    albumId: result.insertedId 
  });
});

module.exports = router;
