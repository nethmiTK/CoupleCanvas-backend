const express = require('express');
const {
  registerVendor,
  loginVendor,
  logout,
  updateVendorProfile,
  changeVendorPassword,
} = require('../Controller/Auth');
const { registerPhotographer, loginPhotographer, updatePhotographerProfile } = require('../Controller/PhotographerAuth');
const { registerUser, loginUser } = require('../Controller/UserAuth');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Photographer routes ───────────────────────────────────────────────────────
router.post('/photographer/register', registerPhotographer);
router.post('/photographer/login', loginPhotographer);
router.put('/photographer/profile', authenticate, requireRole('photographer'), updatePhotographerProfile);

// ── Normal user routes ────────────────────────────────────────────────────────
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);

// ── Old vendor routes — keep untouched for proposals/services/products ────────
router.post('/register', registerVendor);
router.post('/login', loginVendor);
router.post('/logout', logout);
router.put('/profile', updateVendorProfile);
router.put('/change-password', changeVendorPassword);

module.exports = router;