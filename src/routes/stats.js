const express = require('express');
const router = express.Router();
const { getDb } = require('../db/mongo');

router.get('/', async (req, res) => {
    try {
        const db = getDb();

        // Get counts from various collections
        const [albumCount, proposalCount] = await Promise.all([
            db.collection('albums').countDocuments(),
            db.collection('marriage_proposals').countDocuments()
        ]);

        res.json({
            ok: true,
            stats: {
                albums: albumCount || 0,
                proposals: proposalCount || 0,
                // Add more stats if needed
                users: 120, // Placeholder or fetch from users collection
                products: 45 // Placeholder or fetch from products collection
            }
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ ok: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
