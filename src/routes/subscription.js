const express = require('express');
const { getDb } = require('../db/mongo');
const router = express.Router();

// Get all subscription plans
router.get('/sub-plans', async (req, res) => {
  try {
    const db = getDb();
    const plans = await db.collection('sub_plan').find({}).toArray();
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription plans by vendor type
router.get('/sub-plans/:vendorType', async (req, res) => {
  try {
    const db = getDb();
    const { vendorType } = req.params;
    const plans = await db
      .collection('sub_plan')
      .find({ vendorType })
      .toArray();
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
