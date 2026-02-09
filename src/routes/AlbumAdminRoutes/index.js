const express = require('express');
const router = express.Router();

// Import album admin route modules
const layoutPresetsRoutes = require('./layoutPresets');
const albumTemplatesRoutes = require('./albumTemplates');

// Mount routes
router.use('/', layoutPresetsRoutes);
router.use('/', albumTemplatesRoutes);

module.exports = router;
