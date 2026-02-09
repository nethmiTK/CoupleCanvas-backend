const express = require('express');
const router = express.Router();

const {
  getAllPresets,
  getPresetById,
  createPreset,
  updatePreset,
  deletePreset,
  duplicatePreset,
  togglePresetStatus
} = require('../../Controller/AlbumAdminController/layoutPresets');

// GET /api/admin/album/presets - Get all layout presets
router.get('/presets', getAllPresets);

// GET /api/admin/album/presets/:id - Get single preset
router.get('/presets/:id', getPresetById);

// POST /api/admin/album/presets - Create new preset
router.post('/presets', createPreset);

// PUT /api/admin/album/presets/:id - Update preset
router.put('/presets/:id', updatePreset);

// DELETE /api/admin/album/presets/:id - Delete preset
router.delete('/presets/:id', deletePreset);

// POST /api/admin/album/presets/:id/duplicate - Duplicate preset
router.post('/presets/:id/duplicate', duplicatePreset);

// PATCH /api/admin/album/presets/:id/toggle-status - Toggle active/inactive
router.patch('/presets/:id/toggle-status', togglePresetStatus);

module.exports = router;
