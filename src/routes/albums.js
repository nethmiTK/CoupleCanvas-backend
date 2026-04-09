const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendAlbumAccessEmail } = require('../utils/mailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const router = express.Router();

// ── Photographer: get their own albums ───────────────────────────────────────
router.get('/my', authenticate, requireRole('photographer'), async (req, res) => {
  try {
    const db = getDb();
    const albums = await db.collection('albums')
      .find({ photographer_id: new ObjectId(req.user.id) })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ albums });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Photographer: create album ────────────────────────────────────────────────
router.post('/', authenticate, requireRole('photographer'), async (req, res) => {
  try {
    const db = getDb();
    const { title, description, template_id, images, pages, coverPage, selectedPresets } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    const shareToken = crypto.randomBytes(24).toString('hex');

    const result = await db.collection('albums').insertOne({
      photographer_id: new ObjectId(req.user.id),
      template_id: template_id ? new ObjectId(template_id) : null,
      title,
      description: description || '',
      images: images || [],
      pages: pages || [],
      coverPage: coverPage || null,
      selectedPresets: selectedPresets || [],
      coupleAccess: [],
      shareToken,
      shareEnabled: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.status(201).json({
      message: 'Album created',
      albumId: result.insertedId,
      shareToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Photographer: update album ────────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('photographer'), async (req, res) => {
  try {
    const db = getDb();
    const { title, description, images, pages, coverPage, selectedPresets, template_id } = req.body;

    const album = await db.collection('albums').findOne({
      _id: new ObjectId(req.params.id),
      photographer_id: new ObjectId(req.user.id),
    });
    if (!album) return res.status(404).json({ error: 'Album not found or not yours' });

    const updateFields = { updated_at: new Date() };
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (images !== undefined) updateFields.images = images;
    if (pages !== undefined) updateFields.pages = pages;
    if (coverPage !== undefined) updateFields.coverPage = coverPage;
    if (selectedPresets !== undefined) updateFields.selectedPresets = selectedPresets;
    if (template_id) updateFields.template_id = new ObjectId(template_id);

    await db.collection('albums').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields }
    );

    res.json({ message: 'Album updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Photographer: delete album ────────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('photographer'), async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('albums').deleteOne({
      _id: new ObjectId(req.params.id),
      photographer_id: new ObjectId(req.user.id),
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Album not found or not yours' });
    }
    res.json({ message: 'Album deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Photographer: grant couple access + send emails ───────────────────────────
// Body: { couple: [ { name, email }, { name, email } ] }
router.post('/:id/grant-access', authenticate, requireRole('photographer'), async (req, res) => {
  try {
    const db = getDb();
    const { couple } = req.body;

    if (!Array.isArray(couple) || couple.length === 0) {
      return res.status(400).json({ error: 'couple must be a non-empty array of { name, email }' });
    }

    const album = await db.collection('albums').findOne({
      _id: new ObjectId(req.params.id),
      photographer_id: new ObjectId(req.user.id),
    });
    if (!album) return res.status(404).json({ error: 'Album not found or not yours' });

    const photographer = await db.collection('photographers').findOne({
      _id: new ObjectId(req.user.id),
    });

    const accessEntries = [];
    const emailErrors = [];

    for (const person of couple) {
      if (!person.name || !person.email) continue;

      let user = await db.collection('users').findOne({ email: person.email });

      if (!user) {
        const tempPassword = crypto.randomBytes(8).toString('hex');
        const hashed = await bcrypt.hash(tempPassword, 10);
        const inserted = await db.collection('users').insertOne({
          name: person.name,
          email: person.email,
          password: hashed,
          tempPassword,
          createdAt: new Date(),
        });
        user = { _id: inserted.insertedId, name: person.name, email: person.email };
      }

      accessEntries.push({
        userId: user._id,
        name: person.name,
        email: person.email,
        grantedAt: new Date(),
      });

      const accessUrl = `${process.env.FRONTEND_URL}/album/${album.shareToken}`;

      try {
        await sendAlbumAccessEmail({
          toEmail: person.email,
          toName: person.name,
          albumTitle: album.title,
          photographerName: photographer ? photographer.name : 'Your photographer',
          accessUrl,
        });
      } catch (emailErr) {
        console.error(`Email failed for ${person.email}:`, emailErr.message);
        emailErrors.push(person.email);
      }
    }

    const existingEmails = (album.coupleAccess || []).map(a => a.email);
    const newEntries = accessEntries.filter(e => !existingEmails.includes(e.email));

    await db.collection('albums').updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $push: { coupleAccess: { $each: newEntries } },
        $set: { shareEnabled: true, updated_at: new Date() },
      }
    );

    res.json({
      message: 'Access granted and emails sent',
      accessGranted: newEntries.map(e => e.email),
      emailErrors: emailErrors.length ? emailErrors : undefined,
    });
  } catch (err) {
    console.error('Grant access error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Photographer: revoke one person's access ──────────────────────────────────
router.delete('/:id/revoke-access/:email', authenticate, requireRole('photographer'), async (req, res) => {
  try {
    const db = getDb();
    const album = await db.collection('albums').findOne({
      _id: new ObjectId(req.params.id),
      photographer_id: new ObjectId(req.user.id),
    });
    if (!album) return res.status(404).json({ error: 'Album not found or not yours' });

    await db.collection('albums').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { coupleAccess: { email: req.params.email } } }
    );

    res.json({ message: `Access revoked for ${req.params.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User: view albums they have access to ─────────────────────────────────────
router.get('/my-albums', authenticate, requireRole('user'), async (req, res) => {
  try {
    const db = getDb();
    const albums = await db.collection('albums')
      .find({ 'coupleAccess.email': req.user.email })
      .sort({ created_at: -1 })
      .toArray();
    res.json({ albums });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User: toggle share link on/off ────────────────────────────────────────────
router.patch('/share/:shareToken/toggle', authenticate, requireRole('user'), async (req, res) => {
  try {
    const db = getDb();
    const album = await db.collection('albums').findOne({
      shareToken: req.params.shareToken,
      'coupleAccess.email': req.user.email,
    });
    if (!album) return res.status(404).json({ error: 'Album not found or no access' });

    const newState = !album.shareEnabled;
    await db.collection('albums').updateOne(
      { shareToken: req.params.shareToken },
      { $set: { shareEnabled: newState, updated_at: new Date() } }
    );

    res.json({
      message: `Sharing ${newState ? 'enabled' : 'disabled'}`,
      shareEnabled: newState,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Public: view album by share token — no login needed ───────────────────────
router.get('/share/:shareToken', async (req, res) => {
  try {
    const db = getDb();
    const album = await db.collection('albums').findOne({
      shareToken: req.params.shareToken,
      shareEnabled: true,
    });

    if (!album) {
      return res.status(404).json({ error: 'Album not found or sharing is disabled' });
    }

    const { coupleAccess, photographer_id, ...publicAlbum } = album;
    const allPresets = await db.collection('layout_presets').find({}).toArray();

    res.json({ album: publicAlbum, presets: allPresets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: get all albums ─────────────────────────────────────────────────────
router.get('/admin/all', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const albums = await db.collection('albums')
      .find({})
      .sort({ created_at: -1 })
      .toArray();
    res.json({ albums });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: delete any album ───────────────────────────────────────────────────
router.delete('/admin/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    await db.collection('albums').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Album deleted by admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;