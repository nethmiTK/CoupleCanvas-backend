const express = require('express');
const { getDb } = require('../db/mongo');
const router = express.Router();
// Import all route modules
const authRoutes = require('./auth');
const vendorRoutes = require('./vendor');
const productsRoutes = require('./products');
const albumsRoutes = require('./albums');
const servicesRoutes = require('./services');
const chatRoutes = require('./chat');
const paymentRoutes = require('./payment');
const contactRoutes = require('./contact');
const adminRoutes = require('./admin');
const subPlanRoutes = require('./sub_plan');
const paymentSystemRoutes = require('./payment_system');
const uploadRoutes = require('./upload');
const subscriptionRoutes = require('./subscription');
const templateCategoriesRoutes = require('./template_categories');
const albumAdminRoutes = require('./AlbumAdminRoutes');
const albumVendorsRoutes = require('./album_vendors');

// Health check
router.get('/', (req, res) => res.json({ 
  ok: true, 
  message: 'CoupleCanvas Backend API',
  version: '1.0.0',
  timestamp: new Date()
}));

// Test MongoDB connection
router.get('/test-db', async (req, res) => {
  const db = getDb();
  const collections = await db.listCollections().toArray();
  res.json({ 
    connected: true, 
    database: db.databaseName,
    collections: collections.map(c => c.name)
  });
});

// Mount all routes
router.use('/auth', authRoutes);
router.use('/vendor', vendorRoutes);
router.use('/products', productsRoutes);
router.use('/albums', albumsRoutes);
router.use('/services', servicesRoutes);
router.use('/chat', chatRoutes);
router.use('/payment', paymentRoutes);
router.use('/contact', contactRoutes);

// Mount admin routes at /admin
router.use('/admin', adminRoutes);
router.use('/sub_plan', subPlanRoutes);
router.use('/upload', uploadRoutes);
router.use('/template-categories', templateCategoriesRoutes);
router.use('/', subscriptionRoutes);

// Album Admin Routes
router.use('/admin/album', albumAdminRoutes);

// Album Vendors Routes
router.use('/album-vendors', albumVendorsRoutes);

module.exports = router;
