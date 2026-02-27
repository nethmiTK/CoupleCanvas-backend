const express = require('express');
const {
  registerVendor,
  loginVendor,
  registerCustomer,
  loginCustomer,
  logout,
  customerLogout,
  updateVendorProfile,
  changeVendorPassword,
} = require('../Controller/Auth');

const router = express.Router();

// Vendor Routes
router.post('/register', registerVendor);
router.post('/login', loginVendor);
router.post('/logout', logout);
router.put('/profile', updateVendorProfile);
router.put('/change-password', changeVendorPassword);

// Customer Routes
router.post('/customer/register', registerCustomer);
router.post('/customer/login', loginCustomer);
router.post('/customer/logout', customerLogout);

module.exports = router;
