const express = require('express');
const { getDb, ObjectId } = require('../db/mongo');
const router = express.Router();

// Create payment_system
router.post('/', async (req, res) => {
  const db = getDb();
  const { subplan_id, category_system_category_id, price, feature } = req.body;
  if (!subplan_id || !category_system_category_id || !price) {
    return res.status(400).json({ error: 'subplan_id, category_system_category_id, and price are required' });
  }
  const result = await db.collection('payment_system').insertOne({
    subplan_id, // should be the id from sub_plan
    category_system_category_id, // should be the id from category system
    price,
    feature: feature || ''
  });
  res.status(201).json({ message: 'Payment system created', payment_system: result.insertedId });
});

// Get all payment_systems
router.get('/', async (req, res) => {
  const db = getDb();
  const payments = await db.collection('payment_system').find().toArray();
  res.json(payments);
});

// Get single payment_system by id
router.get('/:id', async (req, res) => {
  const db = getDb();
  const payment = await db.collection('payment_system').findOne({ _id: new ObjectId(req.params.id) });
  if (!payment) return res.status(404).json({ error: 'Not found' });
  res.json(payment);
});

// Update payment_system
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { subplan_id, category_system_category_id, price, feature } = req.body;
  const result = await db.collection('payment_system').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { subplan_id, category_system_category_id, price, feature } }
  );
  res.json({ message: 'Payment system updated', modified: result.modifiedCount });
});

// Delete payment_system
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const result = await db.collection('payment_system').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ message: 'Payment system deleted', deleted: result.deletedCount });
});

module.exports = router;
