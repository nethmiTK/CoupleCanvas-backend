const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get chat messages
router.get('/', async (req, res) => {
  const db = getDb();
  const { customer_id, vendor_id, limit = 50 } = req.query;
  
  if (!customer_id) {
    return res.status(400).json({ error: 'customer_id is required' });
  }
  
  const filter = { customer_id: new ObjectId(customer_id) };
  if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);
  
  const messages = await db.collection('chat_messages').aggregate([
    { $match: filter },
    { $sort: { created_at: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customer'
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
  
  res.json({ messages: messages.reverse() });
});

// Send chat message
router.post('/', async (req, res) => {
  const db = getDb();
  const { customer_id, vendor_id, sender_type, message } = req.body;
  
  if (!customer_id || !vendor_id || !sender_type || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const result = await db.collection('chat_messages').insertOne({
    customer_id: new ObjectId(customer_id),
    vendor_id: new ObjectId(vendor_id),
    sender_type, // 'customer' or 'vendor'
    message,
    read: false,
    created_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Message sent successfully',
    messageId: result.insertedId 
  });
});

// Mark messages as read
router.patch('/', async (req, res) => {
  const db = getDb();
  const { customer_id, vendor_id } = req.body;
  
  const filter = { customer_id: new ObjectId(customer_id), read: false };
  if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);
  
  const result = await db.collection('chat_messages').updateMany(
    filter,
    { $set: { read: true, read_at: new Date() } }
  );
  
  res.json({ 
    message: 'Messages marked as read',
    count: result.modifiedCount 
  });
});

module.exports = router;
