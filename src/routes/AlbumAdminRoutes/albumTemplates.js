const express = require('express');
const router = express.Router();

const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleTemplateStatus,
  publishTemplate,
  getTemplateStats,
  incrementUsage
} = require('../../Controller/AlbumAdminController/albumTemplates');

// GET /api/admin/album/templates/stats - Get template statistics
router.get('/templates/stats', getTemplateStats);

// GET /api/admin/album/templates - Get all templates
router.get('/templates', getAllTemplates);

// GET /api/admin/album/templates/:id - Get single template
router.get('/templates/:id', getTemplateById);

// POST /api/admin/album/templates - Create new template
router.post('/templates', createTemplate);

// PUT /api/admin/album/templates/:id - Update template
router.put('/templates/:id', updateTemplate);

// DELETE /api/admin/album/templates/:id - Delete template
router.delete('/templates/:id', deleteTemplate);

// POST /api/admin/album/templates/:id/duplicate - Duplicate template
router.post('/templates/:id/duplicate', duplicateTemplate);

// PATCH /api/admin/album/templates/:id/toggle-status - Toggle active/inactive
router.patch('/templates/:id/toggle-status', toggleTemplateStatus);

// PATCH /api/admin/album/templates/:id/publish - Publish draft template
router.patch('/templates/:id/publish', publishTemplate);

// POST /api/admin/album/templates/:id/use - Increment usage count
router.post('/templates/:id/use', incrementUsage);

module.exports = router;
