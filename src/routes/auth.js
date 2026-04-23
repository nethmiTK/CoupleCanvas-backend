const express = require('express');
const { register, login, getProfile } = require('../Controller/AuthController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new vendor (photographer/proposal)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login vendor
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current vendor profile
 * @access  Private
 */
router.get('/me', authenticate, getProfile);

module.exports = router;