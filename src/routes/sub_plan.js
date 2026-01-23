const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Create sub_plan
router.post('/', async (req, res) => {
  const db = getDb();
  const { name, price, duration, features, vendorType, description } = req.body;
  
  if (!name || !price || !duration) {
    return res.status(400).json({ error: 'name, price, and duration are required' });
  }
  
  const plan = {
    name,
    price: Number(price),
    duration: Number(duration),
    features: Array.isArray(features) ? features : (features ? [features] : []),
    vendorType: vendorType || 'service',
    description: description || '',
    status: 'active',
    createdAt: new Date()
  };
  
  const result = await db.collection('sub_plan').insertOne(plan);
  res.status(201).json({ 
    message: 'Sub plan created successfully',
    subPlan: { ...plan, _id: result.insertedId }
  });
});

// Get all sub_plans
router.get('/', async (req, res) => {
  const db = getDb();
  const plans = await db.collection('sub_plan').find().toArray();
  res.json({ plans });
});

// Get single sub_plan by id
router.get('/:id', async (req, res) => {
  const db = getDb();
  try {
    const plan = await db.collection('sub_plan').findOne({ _id: new ObjectId(req.params.id) });
    if (!plan) return res.status(404).json({ error: 'Sub plan not found' });
    res.json(plan);
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Get plans by vendor type
router.get('/type/:vendorType', async (req, res) => {
  const db = getDb();
  const plans = await db.collection('sub_plan').find({ vendorType: req.params.vendorType }).toArray();
  res.json({ plans });
});

// Update sub_plan
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { name, price, duration, features, vendorType, description, status } = req.body;
  
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (price) updateData.price = Number(price);
    if (duration) updateData.duration = Number(duration);
    if (features) updateData.features = Array.isArray(features) ? features : [features];
    if (vendorType) updateData.vendorType = vendorType;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();
    
    const result = await db.collection('sub_plan').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Sub plan not found' });
    }
    
    res.json({ message: 'Sub plan updated successfully', modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Delete sub_plan
router.delete('/:id', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.collection('sub_plan').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Sub plan not found' });
    }
    res.json({ message: 'Sub plan deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

module.exports = router;
