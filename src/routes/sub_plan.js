const express = require('express');
const { getDb } = require('../db/mongo');
const router = express.Router();

// Create sub_plan
router.post('/', async (req, res) => {
  const db = getDb();
  const { id, name, days } = req.body;
  if (!id || !name || !days) {
    return res.status(400).json({ error: 'id, name, and days are required' });
  }
  const result = await db.collection('sub_plan').insertOne({ id, name, days });
  res.status(201).json({ message: 'Sub plan created', sub_plan: result.insertedId });
});

// Get all sub_plans
router.get('/', async (req, res) => {
  const db = getDb();
  const plans = await db.collection('sub_plan').find().toArray();
  res.json(plans);
});

// Get single sub_plan by id
router.get('/:id', async (req, res) => {
  const db = getDb();
  const plan = await db.collection('sub_plan').findOne({ id: req.params.id });
  if (!plan) return res.status(404).json({ error: 'Not found' });
  res.json(plan);
});

// Update sub_plan
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { name, days } = req.body;
  const result = await db.collection('sub_plan').updateOne(
    { id: req.params.id },
    { $set: { name, days } }
  );
  res.json({ message: 'Sub plan updated', modified: result.modifiedCount });
});

// Delete sub_plan
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const result = await db.collection('sub_plan').deleteOne({ id: req.params.id });
  res.json({ message: 'Sub plan deleted', deleted: result.deletedCount });
});

module.exports = router;
