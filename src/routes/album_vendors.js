const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// GET /api/album-vendors - Get all album vendors (no filter by default)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchFilter = { _init: { $exists: false } };

    if (status && status !== 'all') {
      matchFilter.status = status;
    }

    if (search) {
      matchFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { whatsappNo: { $regex: search, $options: 'i' } },
      ];
    }

    const totalVendors = await db.collection('album_vendors').countDocuments(matchFilter);

    const vendors = await db.collection('album_vendors').aggregate([
      { $match: matchFilter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'vendor_subscriptions',
          let: { vendorId: '$vendor_id' }, // use vendor_id for album vendors as it links to 'vendors' collection used in sub
          pipeline: [
            { $match: { $expr: { $eq: ['$vendorId', '$$vendorId'] }, vendorType: 'album' } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { paymentSlip: 1 } }
          ],
          as: 'latestSubscription'
        }
      },
      {
        $addFields: {
          slipPhoto: {
            $cond: {
              if: { $gt: [{ $size: '$latestSubscription' }, 0] },
              then: { $arrayElemAt: ['$latestSubscription.paymentSlip', 0] },
              else: null
            }
          }
        }
      },
      { $project: { latestSubscription: 0 } }
    ]).toArray();

    res.json({
      success: true,
      vendors,
      pagination: {
        total: totalVendors,
        page,
        limit,
        pages: Math.ceil(totalVendors / limit)
      }
    });
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

    if (status === 'active') {
      // Find the actual vendor doc (to get vendor_id if different)
      const vendor = await db.collection('album_vendors').findOne({ _id: new ObjectId(id) });
      const searchId = vendor?.vendor_id || new ObjectId(id);

      await db.collection('vendor_subscriptions').updateOne(
        { vendorId: new ObjectId(searchId), vendorType: 'album', status: 'pending' },
        { $set: { status: 'active', updatedAt: new Date() } },
        { sort: { createdAt: -1 } }
      );
    }

    if (!result) {
      return res.status(404).json({ success: false, error: 'Album vendor not found' });
    }

    res.json({ success: true, message: `Vendor ${status}`, vendor: result });
  } catch (error) {
    console.error('Error updating vendor status:', error);
    res.status(500).json({ success: false, error: 'Failed to update vendor status' });
  }
});

// DELETE /api/album-vendors/:id - Delete album vendor
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid vendor ID' });
    }

    // Find the vendor doc first
    const vendor = await db.collection('album_vendors').findOne({ _id: new ObjectId(id) });
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Album vendor not found' });
    }

    const vendor_id = vendor.vendor_id;

    // 1. Delete from album_vendors
    await db.collection('album_vendors').deleteOne({ _id: new ObjectId(id) });

    // 2. Delete related records if vendor_id exists
    if (vendor_id) {
      const vObjectId = new ObjectId(vendor_id);

      // Delete from main vendors collection
      await db.collection('vendors').deleteOne({ _id: vObjectId });

      // Delete subscriptions
      await db.collection('vendor_subscriptions').deleteMany({
        vendorId: { $in: [vObjectId, new ObjectId(id)] }
      });

      // Delete albums created by this vendor
      await db.collection('albums').deleteMany({
        vendor_id: { $in: [vObjectId, new ObjectId(id)] }
      });
    }

    res.json({ success: true, message: 'Album vendor and all related records deleted successfully' });
  } catch (error) {
    console.error('Error deleting album vendor:', error);
    res.status(500).json({ success: false, error: 'Failed to delete album vendor' });
  }
});

module.exports = router;
