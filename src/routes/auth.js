const express = require('express');
const { getDb } = require('../db/mongo');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register vendor user with type-specific data (Album, Services, Product, Proposal)
router.post('/register', async (req, res) => {
  const db = getDb();
  try {
    const {
      email,
      username,
      password,
      address,
      birthdate,
      sex,
      vendorTypes,
      album,
      services,
      product,
      proposal,
    } = req.body;

    // Validate required fields
    if (!email || !username || !password || !address || !birthdate || !sex || !vendorTypes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await db.collection('vendors').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Parse vendorTypes if it's a string
    const vendorTypesArray = typeof vendorTypes === 'string' ? JSON.parse(vendorTypes) : vendorTypes;

    // Create main vendor record
    const vendorResult = await db.collection('vendors').insertOne({
      email,
      username,
      password: hashedPassword,
      address,
      birthdate,
      sex,
      vendorTypes: vendorTypesArray,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const vendorId = vendorResult.insertedId;

    // Create type-specific vendor records
    if (vendorTypesArray.includes('album') && album) {
      const albumData = typeof album === 'string' ? JSON.parse(album) : album;
      await db.collection('album_vendors').insertOne({
        vendor_id: vendorId,
        name: albumData.name,
        profilePic: albumData.profilePic || null,
        whatsappNo: albumData.whatsappNo,
        slipPhoto: albumData.slipPhoto || null,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    if (vendorTypesArray.includes('services') && services) {
      const servicesData = typeof services === 'string' ? JSON.parse(services) : services;
      const selectedServices = Array.isArray(servicesData.selectedServices)
        ? servicesData.selectedServices
        : JSON.parse(servicesData.selectedServices || '[]');

      await db.collection('service_vendors').insertOne({
        vendor_id: vendorId,
        whatsappNo: servicesData.whatsappNo,
        profilePic: servicesData.profilePic || null,
        slipPhoto: servicesData.slipPhoto || null,
        status: 'pending',
        createdAt: new Date(),
      });

      // Link selected services
      for (const serviceId of selectedServices) {
        await db.collection('vendor_services').insertOne({
          vendor_id: vendorId,
          service_id: serviceId,
          status: 'active',
          createdAt: new Date(),
        });
      }
    }

    if (vendorTypesArray.includes('product') && product) {
      const productData = typeof product === 'string' ? JSON.parse(product) : product;
      await db.collection('product_vendors').insertOne({
        vendor_id: vendorId,
        companyName: productData.companyName,
        logoPic: productData.logoPic || null,
        description: productData.description,
        whatsappNo: productData.whatsappNo,
        slipPhoto: productData.slipPhoto || null,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    if (vendorTypesArray.includes('proposal') && proposal) {
      const proposalData = typeof proposal === 'string' ? JSON.parse(proposal) : proposal;
      await db.collection('proposal_vendors').insertOne({
        vendor_id: vendorId,
        name: proposalData.name,
        profilePic: proposalData.profilePic || null,
        whatsappNo: proposalData.whatsappNo,
        slipPhoto: proposalData.slipPhoto || null,
        status: 'pending',
        createdAt: new Date(),
      });
    }

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval.',
      vendorId: vendorId,
      status: 'pending',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
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
