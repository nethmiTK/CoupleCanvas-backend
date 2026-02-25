const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Get all admins
router.get('/all', async (req, res) => {
  const db = getDb();
  const admins = await db.collection('admin').find().toArray();
  res.json({ admins });
});

// Admin: Get specific vendor details (Subscription, Profile, Stats)
router.get('/vendor-detail/:id', async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { type } = req.query; // 'album' or 'proposal'

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    let profile = null;
    let counts = { albums: 0, ads: 0 };
    let actualVendorId = id;

    if (type === 'album') {
      profile = await db.collection('album_vendors').findOne({
        $or: [{ _id: new ObjectId(id) }, { vendor_id: new ObjectId(id) }]
      });
      if (profile) actualVendorId = profile.vendor_id || profile._id;
      counts.albums = await db.collection('albums').countDocuments({ vendor_id: new ObjectId(actualVendorId) });
    } else {
      profile = await db.collection('marriage_proposals').findOne({
        $or: [{ _id: new ObjectId(id) }, { vendorId: new ObjectId(id) }]
      });
      if (profile) actualVendorId = profile.vendorId || profile._id;

      if (profile && profile.vendorId) {
        const vid = typeof profile.vendorId === 'string' ? new ObjectId(profile.vendorId) : profile.vendorId;
        counts.ads = await db.collection('marriage_proposals').countDocuments({ vendorId: vid });
      } else {
        counts.ads = 1;
      }
    }

    const subVendorId = actualVendorId || id;

    // Get latest subscription with plan details
    const subscription = await db.collection('vendor_subscriptions').aggregate([
      { $match: { vendorId: new ObjectId(subVendorId), vendorType: type } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
      {
        $addFields: {
          planObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$planId", null] }, { $ne: ["$planId", ""] }] },
              then: { $toObjectId: "$planId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'sub_plan',
          localField: 'planObjectId',
          foreignField: '_id',
          as: 'planDetails'
        }
      },
      { $unwind: { path: '$planDetails', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    res.json({
      success: true,
      profile,
      counts,
      subscription: subscription.length > 0 ? subscription[0] : null
    });
  } catch (err) {
    console.error('Vendor detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ...existing code...

// (Move this route to the end of the file)

// ...existing code...

// Update admin
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { name, email, status, role } = req.body;
  const update = {};
  if (name) update.name = name;
  if (email) update.email = email;
  if (status) update.status = status;
  if (role) update.role = role;
  const result = await db.collection('admin').updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Admin not found' });
  res.json({ message: 'Admin updated' });
});

// Delete admin
router.delete('/:id', async (req, res) => {
  const db = getDb();
  const result = await db.collection('admin').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Admin not found' });
  res.json({ message: 'Admin deleted' });
});

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
  try {
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
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats', details: err.message });
  }
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


// ===== SERVICE CATEGORIES ROUTES =====

// Create service category
router.post('/service-categories', async (req, res) => {
  try {
    const db = getDb();
    const { name, description, imageUrl, status } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: 'name and description are required' });
    }
    const category = {
      name,
      description,
      imageUrl: imageUrl || '',
      status: status || 'active',
      createdAt: new Date()
    };
    const result = await db.collection('service_categories').insertOne(category);
    res.status(201).json({
      message: 'Service category created successfully',
      category: { ...category, _id: result.insertedId }
    });
  } catch (err) {
    console.error('Error creating service category:', err);
    res.status(500).json({ error: 'Failed to create service category', details: err.message });
  }
});

// Get all service categories
router.get('/service-categories', async (req, res) => {
  try {
    const db = getDb();
    const categories = await db.collection('service_categories').find().toArray();
    res.json({ categories });
  } catch (err) {
    console.error('Error fetching service categories:', err);
    res.status(500).json({ error: 'Failed to fetch service categories', details: err.message });
  }
});

// Get single service category by ID
router.get('/service-categories/:id', async (req, res) => {
  const db = getDb();
  try {
    const category = await db.collection('service_categories').findOne({ _id: new ObjectId(req.params.id) });
    if (!category) {
      return res.status(404).json({ error: 'Service category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Update service category
router.put('/service-categories/:id', async (req, res) => {
  const db = getDb();
  const { name, description, imageUrl, status } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();
    const result = await db.collection('service_categories').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Service category not found' });
    }
    res.json({ message: 'Service category updated successfully', modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Delete service category
router.delete('/service-categories/:id', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.collection('service_categories').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Service category not found' });
    }
    res.json({ message: 'Service category deleted successfully', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const admin = await db.collection('admin').findOne({ email });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.collection('admin').updateOne(
      { _id: admin._id },
      { $set: { lastLogin: new Date() } }
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single admin by id (MOVED TO END to avoid route conflicts)
router.get('/:id', async (req, res) => {
  const db = getDb();
  const admin = await db.collection('admin').findOne({ _id: new ObjectId(req.params.id) });
  if (!admin) return res.status(404).json({ error: 'Admin not found' });
  res.json({ admin });
});

module.exports = router;
