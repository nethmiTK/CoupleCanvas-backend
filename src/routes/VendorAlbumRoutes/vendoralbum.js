const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const {
  getAllAlbumTemplates,
  getTemplateCategories,
  getAlbumTemplateById,
  createAlbumTemplate,
  updateAlbumTemplate,
  deleteAlbumTemplate,
  getVendorAlbums,
  createVendorAlbum,
  getAlbumById,
  updateVendorAlbum,
  togglePublishAlbum,
  deleteVendorAlbum,
  getPublicAlbums,
  getPublicAlbumById
} = require('../../Controller/VendorAlbumController/vendoralbum');

// Ensure upload directories exist
const albumUploadsDir = path.join(__dirname, '../../../public/uploads/albums');
if (!fs.existsSync(albumUploadsDir)) {
  fs.mkdirSync(albumUploadsDir, { recursive: true });
}

const templateUploadsDir = path.join(__dirname, '../../../public/uploads/templates');
if (!fs.existsSync(templateUploadsDir)) {
  fs.mkdirSync(templateUploadsDir, { recursive: true });
}

// Multer config for album images
const albumStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, albumUploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = 'album-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const templateStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, templateUploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = 'template-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const uploadAlbumImages = multer({ storage: albumStorage });
const uploadTemplateImage = multer({ storage: templateStorage });

// ======================== TEMPLATE ROUTES ========================

// GET /vendor-album/templates - Get all templates (optionally filter by category or vendor_id)
router.get('/templates', getAllAlbumTemplates);

// GET /vendor-album/templates/categories - Get template categories
router.get('/templates/categories', getTemplateCategories);

// GET /vendor-album/templates/:id - Get single template
router.get('/templates/:id', getAlbumTemplateById);

// POST /vendor-album/templates - Create new template
router.post('/templates', uploadTemplateImage.single('thumbnail'), (req, res, next) => {
  // If a thumbnail file was uploaded, add its path to the body
  if (req.file) {
    req.body.thumbnail = `/uploads/templates/${req.file.filename}`;
  }
  next();
}, createAlbumTemplate);

// PUT /vendor-album/templates/:id - Update template
router.put('/templates/:id', uploadTemplateImage.single('thumbnail'), (req, res, next) => {
  if (req.file) {
    req.body.thumbnail = `/uploads/templates/${req.file.filename}`;
  }
  next();
}, updateAlbumTemplate);

// DELETE /vendor-album/templates/:id - Delete template
router.delete('/templates/:id', deleteAlbumTemplate);

// ======================== ALBUM ROUTES ========================

// GET /vendor-album/albums - Get vendor albums
router.get('/albums', getVendorAlbums);

// GET /vendor-album/albums/:id - Get single album
router.get('/albums/:id', getAlbumById);

// POST /vendor-album/albums - Create album with images
router.post('/albums', uploadAlbumImages.array('images', 50), createVendorAlbum);

// PUT /vendor-album/albums/:id - Update album (with image upload support)
router.put('/albums/:id', uploadAlbumImages.array('images', 50), updateVendorAlbum);

// PATCH /vendor-album/albums/:id/publish - Toggle publish status
router.patch('/albums/:id/publish', togglePublishAlbum);

// DELETE /vendor-album/albums/:id - Delete album
router.delete('/albums/:id', deleteVendorAlbum);

// ======================== PUBLIC ROUTES (no auth) ========================

// GET /vendor-album/public/albums - Get all published albums
router.get('/public/albums', getPublicAlbums);

// GET /vendor-album/public/albums/:id - Get single published album
router.get('/public/albums/:id', getPublicAlbumById);

module.exports = router;
