const express = require('express');
const { register, login, getProfile, updateProfile } = require('../Controller/AuthController');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const profileUploadsDir = path.join(__dirname, '../../public/uploads/profiles');
if (!fs.existsSync(profileUploadsDir)) {
	fs.mkdirSync(profileUploadsDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, profileUploadsDir),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		cb(null, `photographer-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
	},
});

const uploadProfileImage = multer({ storage: profileStorage });

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getProfile);
router.put('/profile/update', authenticate, uploadProfileImage.single('profileImage'), updateProfile);

module.exports = router;