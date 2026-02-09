const { getDb } = require('../../db/mongo');
const { ObjectId } = require('mongodb');

// Get all album templates
const getAllTemplates = async (req, res) => {
  const db = getDb();
  try {
    const { category, pages, status, search, limit = 50, page = 1 } = req.query;

    const filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (status && status !== 'all') {
      filter.status = status === 'true' || status === 'active';
    }
    
    if (pages && pages !== 'all') {
      filter.pagesCount = parseInt(pages);
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const templates = await db.collection('album_templates')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('album_templates').countDocuments(filter);

    res.json({ 
      success: true, 
      templates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
};

// Get single template by ID
const getTemplateById = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await db.collection('album_templates').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template' });
  }
};

// Create new album template
const createTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { 
      name, 
      category,
      description,
      status,
      pagesCount,
      albumSize,
      coverType,
      dpi,
      bleed,
      coverImage,
      galleryImages,
      font,
      primaryColor,
      secondaryColor,
      selectedPresets,
      isDraft
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template name is required' 
      });
    }

    if (!category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Category is required' 
      });
    }

    // Check if name already exists
    const existing = await db.collection('album_templates').findOne({ name });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Template with this name already exists' 
      });
    }

    const newTemplate = {
      name,
      category: category || 'wedding',
      description: description || '',
      status: isDraft ? false : (status !== undefined ? status : true),
      isDraft: isDraft || false,
      
      // Album specs
      pagesCount: parseInt(pagesCount) || 20,
      albumSize: albumSize || '12x12',
      coverType: coverType || 'hard',
      dpi: parseInt(dpi) || 300,
      bleed: parseInt(bleed) || 3,
      
      // Preview media
      coverImage: coverImage || '',
      galleryImages: galleryImages || [],
      
      // Theme
      font: font || 'Inter',
      primaryColor: primaryColor || '#E11D48',
      secondaryColor: secondaryColor || '#FB7185',
      
      // Selected layout presets
      selectedPresets: selectedPresets || [],
      
      // Meta
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('album_templates').insertOne(newTemplate);

    res.status(201).json({ 
      success: true, 
      message: isDraft ? 'Template saved as draft' : 'Template created successfully',
      template: { ...newTemplate, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: 'Failed to create template' });
  }
};

// Update album template
const updateTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    // Remove _id from updateData if present
    delete updateData._id;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const result = await db.collection('album_templates').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ 
      success: true, 
      message: 'Template updated successfully',
      template: result
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: 'Failed to update template' });
  }
};

// Delete album template
const deleteTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const result = await db.collection('album_templates').deleteOne({ 
      _id: new ObjectId(id) 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
};

// Duplicate template
const duplicateTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const original = await db.collection('album_templates').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!original) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Create duplicate with new name
    const duplicate = {
      ...original,
      _id: undefined,
      name: `${original.name} (Copy)`,
      status: false,
      isDraft: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    delete duplicate._id;

    const result = await db.collection('album_templates').insertOne(duplicate);

    res.status(201).json({ 
      success: true, 
      message: 'Template duplicated successfully',
      template: { ...duplicate, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error duplicating template:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate template' });
  }
};

// Toggle template status (active/inactive)
const toggleTemplateStatus = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const template = await db.collection('album_templates').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const newStatus = !template.status;

    await db.collection('album_templates').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: newStatus,
          isDraft: false,
          updatedAt: new Date() 
        } 
      }
    );

    res.json({ 
      success: true, 
      message: `Template ${newStatus ? 'activated' : 'deactivated'} successfully`,
      status: newStatus
    });
  } catch (error) {
    console.error('Error toggling template status:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle status' });
  }
};

// Publish draft template
const publishTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    const result = await db.collection('album_templates').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: true, 
          isDraft: false,
          publishedAt: new Date(),
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ 
      success: true, 
      message: 'Template published successfully',
      template: result
    });
  } catch (error) {
    console.error('Error publishing template:', error);
    res.status(500).json({ success: false, error: 'Failed to publish template' });
  }
};

// Get template statistics
const getTemplateStats = async (req, res) => {
  const db = getDb();
  try {
    const stats = await db.collection('album_templates').aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { status: true } }, { $count: 'count' }],
          drafts: [{ $match: { isDraft: true } }, { $count: 'count' }],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } }
          ],
          byPages: [
            { $group: { _id: '$pagesCount', count: { $sum: 1 } } }
          ],
          mostUsed: [
            { $sort: { usageCount: -1 } },
            { $limit: 5 },
            { $project: { name: 1, usageCount: 1, category: 1, pagesCount: 1 } }
          ]
        }
      }
    ]).toArray();

    const result = stats[0];

    res.json({
      success: true,
      stats: {
        total: result.total[0]?.count || 0,
        active: result.active[0]?.count || 0,
        drafts: result.drafts[0]?.count || 0,
        byCategory: result.byCategory,
        byPages: result.byPages,
        mostUsed: result.mostUsed
      }
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
};

// Increment template usage count
const incrementUsage = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid template ID' });
    }

    await db.collection('album_templates').updateOne(
      { _id: new ObjectId(id) },
      { $inc: { usageCount: 1 } }
    );

    res.json({ success: true, message: 'Usage count incremented' });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({ success: false, error: 'Failed to increment usage' });
  }
};

module.exports = {
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
};
