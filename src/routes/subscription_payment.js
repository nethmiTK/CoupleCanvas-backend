const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { slipUpload } = require('../config/multer');
const {
  uploadPaymentSlip,
  subscribeWithSlip,
  getMySubscription,
  createPayHereCheckout,
  payHereCallback,
  adminUpdateSubscriptionStatus,
  getSubscriptionAccessState,
} = require('../Controller/subscriptionController');

const router = express.Router();

router.post('/upload-slip', authenticate, slipUpload.single('image'), uploadPaymentSlip);
router.post('/subscribe', authenticate, subscribeWithSlip);
router.get('/my/:vendorId', authenticate, getMySubscription);
router.get('/access/:vendorId', authenticate, getSubscriptionAccessState);
router.post('/payhere/initiate', authenticate, createPayHereCheckout);
router.post('/payhere/callback', payHereCallback);
router.patch('/admin/:vendorId/status', authenticate, adminUpdateSubscriptionStatus);

module.exports = router;
