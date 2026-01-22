const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Process payment
router.post('/', async (req, res) => {
  const db = getDb();
  const { 
    vendor_id, 
    amount, 
    payment_method, 
    transaction_id,
    payment_details 
  } = req.body;
  
  if (!vendor_id || !amount) {
    return res.status(400).json({ error: 'vendor_id and amount are required' });
  }
  
  // Insert payment record
  const paymentResult = await db.collection('payments').insertOne({
    vendor_id: new ObjectId(vendor_id),
    amount: parseFloat(amount),
    payment_method: payment_method || 'online',
    transaction_id,
    payment_details,
    status: 'completed',
    created_at: new Date()
  });
  
  // Auto-approve vendor profile
  await db.collection('vendor_profiles').updateOne(
    { _id: new ObjectId(vendor_id) },
    { 
      $set: { 
        approval_status: 'approved',
        approved_at: new Date()
      } 
    }
  );
  
  res.status(201).json({ 
    message: 'Payment processed and vendor approved successfully',
    paymentId: paymentResult.insertedId 
  });
});

// Get payment history
router.get('/', async (req, res) => {
  const db = getDb();
  const { vendor_id } = req.query;
  
  if (!vendor_id) {
    return res.status(400).json({ error: 'vendor_id is required' });
  }
  
  const payments = await db.collection('payments').find({
    vendor_id: new ObjectId(vendor_id)
  }).sort({ created_at: -1 }).toArray();
  
  res.json({ payments });
});

module.exports = router;
