const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Create contact message
router.post('/', async (req, res) => {
  const db = getDb();
  const { name, email, phone, subject, message, vendor_id } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }
  
  const result = await db.collection('contacts').insertOne({
    name,
    email,
    phone: phone || '',
    subject: subject || 'General Inquiry',
    message,
    vendor_id: vendor_id ? new ObjectId(vendor_id) : null,
    status: 'new',
    created_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Contact message sent successfully',
    contactId: result.insertedId 
  });
});

// Get contact messages
router.get('/', async (req, res) => {
  const db = getDb();
  const { vendor_id, status } = req.query;
  
  const filter = {};
  if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);
  if (status) filter.status = status;
  
  const contacts = await db.collection('contacts')
    .find(filter)
    .sort({ created_at: -1 })
    .toArray();
  
  res.json({ contacts });
});

// Update contact message status
router.patch('/', async (req, res) => {
  const db = getDb();
  const { contact_id, status } = req.body;
  
  if (!contact_id || !status) {
    return res.status(400).json({ error: 'contact_id and status are required' });
  }
  
  await db.collection('contacts').updateOne(
    { _id: new ObjectId(contact_id) },
    { $set: { status, updated_at: new Date() } }
  );
  
  res.json({ message: 'Contact status updated successfully' });
});

module.exports = router;
