const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../../public/uploads');
const paymentSlipsDir = path.join(uploadsDir, 'payment-slips');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(paymentSlipsDir)) {
  fs.mkdirSync(paymentSlipsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const paymentSlipStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, paymentSlipsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = 'slip-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });
const paymentSlipUpload = multer({ 
  storage: paymentSlipStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// POST /api/upload/service-category-image
router.post('/service-category-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// POST /api/upload/payment-slip
router.post('/payment-slip', paymentSlipUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/payment-slips/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router;
