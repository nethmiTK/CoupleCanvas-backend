const express = require('express');
const { getDb } = require('../db/mongo');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register vendor user
router.post('/register', async (req, res) => {
  const db = getDb();
  const { email, password, phone, full_name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Check if user exists
  const existingUser = await db.collection('users').findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await db.collection('users').insertOne({
    email,
    password: hashedPassword,
    phone: phone || '',
    full_name: full_name || '',
    role: 'vendor',
    created_at: new Date(),
    updated_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'User registered successfully',
    userId: result.insertedId 
  });
});

// Login user
router.post('/login', async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = await db.collection('users').findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({ 
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    }
  });
});

// Register customer
router.post('/customer/register', async (req, res) => {
  const db = getDb();
  const { name, email, phone, password } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  
  const existingCustomer = await db.collection('customers').findOne({ email });
  if (existingCustomer) {
    return res.status(400).json({ error: 'Customer already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await db.collection('customers').insertOne({
    name,
    email,
    phone: phone || '',
    password: hashedPassword,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  res.status(201).json({ 
    message: 'Customer registered successfully',
    customerId: result.insertedId 
  });
});

// Login customer
router.post('/customer/login', async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const customer = await db.collection('customers').findOne({ email });
  if (!customer) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, customer.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign(
    { customerId: customer._id, email: customer.email, role: 'customer' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({ 
    message: 'Login successful',
    token,
    customer: {
      id: customer._id,
      email: customer.email,
      name: customer.name
    }
  });
});


// Logout user (stateless, just for client convenience)
router.post('/logout', (req, res) => {
  // On frontend, just remove token. Here, just respond OK.
  res.json({ message: 'Logged out successfully' });
});

// Logout customer (stateless, just for client convenience)
router.post('/customer/logout', (req, res) => {
  res.json({ message: 'Customer logged out successfully' });
});

module.exports = router;
