const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// GET /api/album-vendors - Get all album vendors (no filter by default)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { status, search } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { whatsappNo: { $regex: search, $options: 'i' } },
      ];
    }

    const vendors = await db
      .collection('album_vendors')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, vendors, count: vendors.length });
  } catch (error) {
    console.error('Error fetching album vendors:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch album vendors' });
  }
});

// GET /api/album-vendors/:id - Get single album vendor
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid vendor ID' });
    }

    const vendor = await db.collection('album_vendors').findOne({ _id: new ObjectId(id) });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Album vendor not found' });
    }

    res.json({ success: true, vendor });
  } catch (error) {
    console.error('Error fetching album vendor:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch album vendor' });
  }
});

// PATCH /api/album-vendors/:id/status - Update vendor status
router.patch('/:id/status', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid vendor ID' });
    }

    const result = await db.collection('album_vendors').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Album vendor not found' });
    }

    res.json({ success: true, message: `Vendor ${status}`, vendor: result });
  } catch (error) {
    console.error('Error updating vendor status:', error);
    res.status(500).json({ success: false, error: 'Failed to update vendor status' });
  }
});

module.exports = router;
