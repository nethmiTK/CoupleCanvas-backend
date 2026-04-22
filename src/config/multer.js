const fs = require('fs');
const path = require('path');
const multer = require('multer');

const paymentSlipsDir = path.join(__dirname, '../../public/uploads/payment-slips');
if (!fs.existsSync(paymentSlipsDir)) {
  fs.mkdirSync(paymentSlipsDir, { recursive: true });
}

const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, paymentSlipsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `slip-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const slipUpload = multer({
  storage: slipStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed'));
    }
    cb(null, true);
  },
});

module.exports = {
  slipUpload,
};
