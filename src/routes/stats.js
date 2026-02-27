const express = require('express');
const router = express.Router();
const { getDb } = require('../db/mongo');

router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [
            albumCount,
            proposalCount,
            albumVendorCount,
            proposalVendorCount,
            albumVendorActiveCount,
            proposalVendorActiveCount,
            albumVendorPendingCount,
            proposalVendorPendingCount,
            albumVendorExpiredCount,
            proposalVendorExpiredCount,
            customersCount,
            subscriptionRevenue,
            revenueBreakdown,
            recentSubscriptions,
            contactCount,
            newContactsCount,
            recentContacts,
        ] = await Promise.all([
            db.collection('albums').countDocuments(),
            db.collection('marriage_proposals').countDocuments(),
            db.collection('album_vendors').countDocuments(),
            db.collection('proposal_vendors').countDocuments(),
            db.collection('album_vendors').countDocuments({ status: 'active' }),
            db.collection('proposal_vendors').countDocuments({ status: 'active' }),
            db.collection('album_vendors').countDocuments({ status: 'pending' }),
            db.collection('proposal_vendors').countDocuments({ status: 'pending' }),
            db.collection('album_vendors').countDocuments({ status: { $ne: 'active' }, createdAt: { $lt: sevenDaysAgo } }),
            db.collection('proposal_vendors').countDocuments({ status: { $ne: 'active' }, createdAt: { $lt: sevenDaysAgo } }),
            db.collection('customers').countDocuments(),
            db.collection('vendor_subscriptions').aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray(),
            db.collection('vendor_subscriptions').aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: '$vendorType', total: { $sum: '$amount' } } }
            ]).toArray(),
            db.collection('vendor_subscriptions').aggregate([
                { $match: { status: 'active' } },
                { $sort: { createdAt: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'album_vendors',
                        localField: 'vendorId',
                        foreignField: 'vendor_id',
                        as: 'albumVendorProfile'
                    }
                },
                {
                    $lookup: {
                        from: 'proposal_vendors',
                        localField: 'vendorId',
                        foreignField: '_id',
                        as: 'proposalVendorProfile'
                    }
                },
                {
                    $addFields: {
                        vendorName: {
                            $cond: {
                                if: { $eq: ['$vendorType', 'album'] },
                                then: { $arrayElemAt: ['$albumVendorProfile.name', 0] },
                                else: { $arrayElemAt: ['$proposalVendorProfile.name', 0] }
                            }
                        },
                        vendorProfilePic: {
                            $cond: {
                                if: { $eq: ['$vendorType', 'album'] },
                                then: { $arrayElemAt: ['$albumVendorProfile.profilePic', 0] }, // fallback to profile_image if needed
                                else: { $arrayElemAt: ['$proposalVendorProfile.profilePic', 0] }
                            }
                        }
                    }
                },
                { $project: { albumVendorProfile: 0, proposalVendorProfile: 0 } }
            ]).toArray(),
            db.collection('contacts').countDocuments(),
            db.collection('contacts').countDocuments({ status: 'new' }),
            db.collection('contacts').find().sort({ created_at: -1 }).limit(10).toArray()
        ]);

        // Transform revenue breakdown into a better format
        const breakdown = {
            album: 0,
            proposal: 0,
            service: 0,
            product: 0
        };
        revenueBreakdown.forEach(item => {
            if (item._id) breakdown[item._id] = item.total;
        });

        // Monthly breakdown (last 6 months subscriptions)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyRevenue = await db.collection('vendor_subscriptions').aggregate([
            { $match: { status: 'active', createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]).toArray();

        res.json({
            ok: true,
            stats: {
                albums: albumCount || 0,
                proposals: proposalCount || 0,
                albumVendors: albumVendorCount || 0,
                proposalVendors: proposalVendorCount || 0,
                albumVendorsActive: albumVendorActiveCount || 0,
                proposalVendorsActive: proposalVendorActiveCount || 0,
                albumVendorsPending: albumVendorPendingCount || 0,
                proposalVendorsPending: proposalVendorPendingCount || 0,
                albumVendorsExpired: albumVendorExpiredCount || 0,
                proposalVendorsExpired: proposalVendorExpiredCount || 0,
                customers: customersCount || 0,
                totalRevenue: subscriptionRevenue[0]?.total || 0,
                revenueBreakdown: breakdown,
                recentSubscriptions,
                monthlyRevenue,
                contacts: contactCount || 0,
                newContacts: newContactsCount || 0,
                recentContacts,
            }
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ ok: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
