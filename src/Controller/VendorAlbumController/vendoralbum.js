const { getDb } = require('../../db/mongo');
const { ObjectId } = require('mongodb');

// ======================== ALBUM TEMPLATES ========================

// Get all album templates (system-wide for selection)
const getAllAlbumTemplates = async (req, res) => {
  const db = getDb();
  try {
    const { category, vendor_id } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    // If vendor_id provided, get vendor-specific templates
    if (vendor_id) {
      query.vendor_id = vendor_id;
    }

    const templates = await db.collection('album_templates')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching album templates:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get template categories
const getTemplateCategories = async (req, res) => {
  const db = getDb();
  try {
    const categories = await db.collection('template_categories')
      .find({ status: 'active' })
      .sort({ name: 1 })
      .toArray();

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching template categories:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single template by ID
const getAlbumTemplateById = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    const template = await db.collection('album_templates').findOne({
      _id: new ObjectId(id)
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new album template
const createAlbumTemplate = async (req, res) => {
  const db = getDb();
  try {
    const {
      vendor_id,
      name,
      category,
      description,
      photosPerPage,
      slots,
      background,
      decorations,
      colors,
      thumbnail
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    // Parse JSON strings if sent as strings
    const parsedSlots = typeof slots === 'string' ? JSON.parse(slots) : (slots || []);
    const parsedBackground = typeof background === 'string' ? JSON.parse(background) : (background || { type: 'solid', value: '#ffffff' });
    const parsedDecorations = typeof decorations === 'string' ? JSON.parse(decorations) : (decorations || { type: 'none', positions: [] });
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : (colors || { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FF4081', text: '#880E4F' });

    const template = {
      vendor_id: vendor_id || null,
      name,
      category,
      description: description || '',
      photosPerPage: parseInt(photosPerPage) || parsedSlots.length || 2,
      slots: parsedSlots,
      background: parsedBackground,
      decorations: parsedDecorations,
      colors: parsedColors,
      thumbnail: thumbnail || '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('album_templates').insertOne(template);

    res.status(201).json({
      message: 'Template created successfully',
      templateId: result.insertedId,
      template: { ...template, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update album template
const updateAlbumTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    // Parse JSON strings if sent as strings
    if (typeof updateData.slots === 'string') updateData.slots = JSON.parse(updateData.slots);
    if (typeof updateData.background === 'string') updateData.background = JSON.parse(updateData.background);
    if (typeof updateData.decorations === 'string') updateData.decorations = JSON.parse(updateData.decorations);
    if (typeof updateData.colors === 'string') updateData.colors = JSON.parse(updateData.colors);

    updateData.updatedAt = new Date();

    await db.collection('album_templates').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete album template
const deleteAlbumTemplate = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    await db.collection('album_templates').deleteOne({
      _id: new ObjectId(id)
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
};

// ======================== VENDOR ALBUMS ========================

// Get vendor albums
const getVendorAlbums = async (req, res) => {
  const db = getDb();
  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return res.status(400).json({ error: 'vendor_id is required' });
    }

    const albums = await db.collection('albums')
      .aggregate([
        { $match: { vendor_id: vendor_id } },
        {
          $lookup: {
            from: 'album_templates',
            let: { templateId: '$template_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      { $toString: '$_id' },
                      '$$templateId'
                    ]
                  }
                }
              }
            ],
            as: 'template'
          }
        },
        { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    res.json({ albums });
  } catch (error) {
    console.error('Error fetching vendor albums:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create vendor album
const createVendorAlbum = async (req, res) => {
  const db = getDb();
  try {
    const {
      vendor_id,
      template_id,
      album_title,
      description,
      price,
      category,
      template_data
    } = req.body;

    if (!vendor_id || !album_title) {
      return res.status(400).json({ error: 'vendor_id and album_title are required' });
    }

    // Handle uploaded images
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        images.push(`/uploads/albums/${file.filename}`);
      });
    }

    const parsedTemplateData = typeof template_data === 'string' ? JSON.parse(template_data) : template_data;

    const album = {
      vendor_id,
      template_id: template_id || null,
      album_title,
      description: description || '',
      price: parseFloat(price) || 0,
      category: category || '',
      images: JSON.stringify(images),
      template_data: parsedTemplateData || null,
      availability_status: 'available',
      publish_status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('albums').insertOne(album);

    res.status(201).json({
      message: 'Album created successfully',
      albumId: result.insertedId,
      album: { ...album, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get single album by ID
const getAlbumById = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    const album = await db.collection('albums').aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'album_templates',
          let: { templateId: '$template_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toString: '$_id' },
                    '$$templateId'
                  ]
                }
              }
            }
          ],
          as: 'template'
        }
      },
      { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } }
    ]).toArray();

    if (!album || album.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json({ album: album[0] });
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update vendor album
const updateVendorAlbum = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    updateData.updatedAt = new Date();

    await db.collection('albums').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({ message: 'Album updated successfully' });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle publish status
const togglePublishAlbum = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { publish_status } = req.body;

    if (!['published', 'draft'].includes(publish_status)) {
      return res.status(400).json({ error: 'Invalid publish_status. Use published or draft' });
    }

    await db.collection('albums').updateOne(
      { _id: new ObjectId(id) },
      { $set: { publish_status, updatedAt: new Date() } }
    );

    res.json({ message: `Album ${publish_status === 'published' ? 'published' : 'unpublished'} successfully` });
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete vendor album
const deleteVendorAlbum = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    await db.collection('albums').deleteOne({
      _id: new ObjectId(id)
    });

    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllAlbumTemplates,
  getTemplateCategories,
  getAlbumTemplateById,
  createAlbumTemplate,
  updateAlbumTemplate,
  deleteAlbumTemplate,
  getVendorAlbums,
  createVendorAlbum,
  getAlbumById,
  updateVendorAlbum,
  togglePublishAlbum,
  deleteVendorAlbum
};
