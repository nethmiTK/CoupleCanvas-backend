const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get all albums (with optional vendor_id filter)
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const { vendor_id } = req.query;

    const filter = {};
    if (vendor_id) filter.vendor_id = new ObjectId(vendor_id);

    const albums = await db.collection('albums').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'album_vendors',
          let: { vId: "$vendor_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$vId"] },
                    { $eq: ["$vendor_id", "$$vId"] }
                  ]
                }
              }
            }
          ],
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'vendor.status': 'active'
        }
      },
      {
        $lookup: {
          from: 'album_templates',
          localField: 'template_id',
          foreignField: '_id',
          as: 'template'
        }
      },
      { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: -1 } }
    ]).toArray();

    res.json({ albums });
  } catch (err) {
    console.error('Error fetching albums:', err);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// Get single album by ID (with presets data for viewer)
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const album = await db.collection('albums').aggregate([
      { $match: { _id: new ObjectId(req.params.id) } },
      {
        $lookup: {
          from: 'album_vendors',
          localField: 'vendor_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'album_templates',
          localField: 'template_id',
          foreignField: '_id',
          as: 'template'
        }
      },
      { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    if (!album.length) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Fetch all layout presets for rendering
    const allPresets = await db.collection('layout_presets').find({}).toArray();

    res.json({ album: album[0], presets: allPresets });
  } catch (err) {
    console.error('Error fetching album:', err);
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

// Create album
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { vendor_id, template_id, title, description, images, selectedPresets, pages, coverPage } = req.body;

    const result = await db.collection('albums').insertOne({
      vendor_id: new ObjectId(vendor_id),
      template_id: new ObjectId(template_id),
      title,
      description: description || '',
      images: images || [],
      selectedPresets: selectedPresets || [],
      pages: pages || [],
      coverPage: coverPage || null,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      message: 'Album created successfully',
      albumId: result.insertedId
    });
  } catch (err) {
    console.error('Error creating album:', err);
    res.status(500).json({ error: 'Failed to create album' });
  }
});

// Update album
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { title, description, images, selectedPresets, template_id, pages, coverPage } = req.body;

    const updateFields = { updated_at: new Date() };
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (images !== undefined) updateFields.images = images;
    if (selectedPresets !== undefined) updateFields.selectedPresets = selectedPresets;
    if (pages !== undefined) updateFields.pages = pages;
    if (coverPage !== undefined) updateFields.coverPage = coverPage;
    if (template_id) updateFields.template_id = new ObjectId(template_id);

    const result = await db.collection('albums').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json({ message: 'Album updated successfully' });
  } catch (err) {
    console.error('Error updating album:', err);
    res.status(500).json({ error: 'Failed to update album' });
  }
});

// Delete album
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('albums').deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    res.json({ message: 'Album deleted successfully' });
  } catch (err) {
    console.error('Error deleting album:', err);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

module.exports = router;
