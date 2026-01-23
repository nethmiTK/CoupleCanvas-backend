
const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Admin signup

router.post('/signup', async (req, res) => {
  const db = getDb();
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const existing = await db.collection('admin').findOne({ email });
  if (existing) {
    return res.status(400).json({ error: 'Admin already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  // Generate id (use email or random)
  const id = 'admin_' + Math.random().toString(36).substring(2, 10);
  const result = await db.collection('admin').insertOne({
    id,
    name,
    email,
    password: hashedPassword,
    createdDate: new Date(),
    lastLogin: null
  });
  res.status(201).json({ message: 'Admin registered successfully', adminId: result.insertedId });
});

// Get pending vendors for approval
router.get('/approve', async (req, res) => {
  const db = getDb();
  
  const vendors = await db.collection('vendor_profiles').aggregate([
    { $match: { approval_status: 'pending' } },
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
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $sort: { created_at: 1 } }
  ]).toArray();
  
  res.json({ vendors });
});

// Approve or reject vendor
router.post('/approve', async (req, res) => {
  const db = getDb();
  const { vendor_id, status, admin_remarks, admin_id } = req.body;
  
  if (!vendor_id || !status) {
    return res.status(400).json({ error: 'vendor_id and status are required' });
  }
  
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or rejected' });
  }
  
  // Update vendor profile
  await db.collection('vendor_profiles').updateOne(
    { _id: new ObjectId(vendor_id) },
    { 
      $set: { 
        approval_status: status,
        admin_remarks: admin_remarks || '',
        approved_at: status === 'approved' ? new Date() : null,
        updated_at: new Date()
      } 
    }
  );
  
  // Log the approval action
  await db.collection('admin_approval_log').insertOne({
    vendor_id: new ObjectId(vendor_id),
    admin_id: admin_id ? new ObjectId(admin_id) : null,
    action: status,
    remarks: admin_remarks || '',
    created_at: new Date()
  });
  
  res.json({ message: `Vendor ${status} successfully` });
});

// Get statistics
router.get('/stats', async (req, res) => {
  const db = getDb();
  
  const [
    albumsCount,
    servicesCount,
    productsCount,
    proposalsCount,
    usersCount,
    vendorsCount,
    customersCount,
    pendingVendorsCount
  ] = await Promise.all([
    db.collection('albums').countDocuments(),
    db.collection('services').countDocuments(),
    db.collection('vendor_products').countDocuments(),
    db.collection('vendor_proposal').countDocuments(),
    db.collection('users').countDocuments(),
    db.collection('vendor_profiles').countDocuments(),
    db.collection('customers').countDocuments(),
    db.collection('vendor_profiles').countDocuments({ approval_status: 'pending' })
  ]);
  
  res.json({
    stats: {
      albums: albumsCount,
      services: servicesCount,
      products: productsCount,
      proposals: proposalsCount,
      users: usersCount,
      vendors: vendorsCount,
      customers: customersCount,
      pendingVendors: pendingVendorsCount
    }
  });
});

// Cleanup expired profiles
router.get('/cleanup/expired-profiles', async (req, res) => {
  const db = getDb();
  
  const result = await db.collection('vendor_profiles').deleteMany({
    expire_date: { $lt: new Date() }
  });
  
  res.json({ 
    message: 'Expired profiles cleaned up',
    deletedCount: result.deletedCount 
  });
});

// Admin login
router.post('/login', async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const admin = await db.collection('admin').findOne({ email });
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  // Update lastLogin
  await db.collection('admin').updateOne({ _id: admin._id }, { $set: { lastLogin: new Date() } });
  const token = jwt.sign({ adminId: admin._id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    message: 'Login successful',
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email
    }
  });
});

// ===== SYSTEM CATEGORY ROUTES (sys_cat) =====

// Create system category
router.post('/categories', async (req, res) => {
  const db = getDb();
  const { type, description, profilePic, key } = req.body;
  
  if (!type || !description) {
    return res.status(400).json({ error: 'type and description are required' });
  }
  
  const category = {
    type,
    description,
    profilePic: profilePic || null,
    key: key || null,
    createdAt: new Date(),
    status: 'active'
  };
  
  const result = await db.collection('sys_cat').insertOne(category);
  res.status(201).json({ 
    message: 'Category created successfully',
    category: { ...category, _id: result.insertedId }
  });
});

// Get all categories
router.get('/categories', async (req, res) => {
  const db = getDb();
  const categories = await db.collection('sys_cat').find().toArray();
  res.json({ categories });
});

// Get single category by ID
router.get('/categories/:id', async (req, res) => {
  const db = getDb();
  try {
    const category = await db.collection('sys_cat').findOne({ _id: new ObjectId(req.params.id) });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  const db = getDb();
  const { type, description, profilePic, key, status } = req.body;
  
  try {
    const updateData = {};
    if (type) updateData.type = type;
    if (description) updateData.description = description;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    if (key !== undefined) updateData.key = key;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();
    
    const result = await db.collection('sys_cat').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category updated successfully', modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.collection('sys_cat').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

module.exports = router;
