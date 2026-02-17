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
      thumbnail,
      gridPatterns,
      coverStyle
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'name and category are required' });
    }

    // Parse JSON strings if sent as strings
    const parsedSlots = typeof slots === 'string' ? JSON.parse(slots) : (slots || []);
    const parsedBackground = typeof background === 'string' ? JSON.parse(background) : (background || { type: 'solid', value: '#ffffff' });
    const parsedDecorations = typeof decorations === 'string' ? JSON.parse(decorations) : (decorations || { type: 'none', positions: [] });
    const parsedColors = typeof colors === 'string' ? JSON.parse(colors) : (colors || { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FF4081', text: '#880E4F' });
    const parsedGridPatterns = typeof gridPatterns === 'string' ? JSON.parse(gridPatterns) : (gridPatterns || null);
    const parsedCoverStyle = typeof coverStyle === 'string' ? JSON.parse(coverStyle) : (coverStyle || null);

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
      gridPatterns: parsedGridPatterns,
      coverStyle: parsedCoverStyle,
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
    if (typeof updateData.gridPatterns === 'string') updateData.gridPatterns = JSON.parse(updateData.gridPatterns);
    if (typeof updateData.coverStyle === 'string') updateData.coverStyle = JSON.parse(updateData.coverStyle);

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
      template_data,
      page_settings,
      cover_page,
      pages
    } = req.body;

    if (!vendor_id || !album_title) {
      return res.status(400).json({ error: 'vendor_id and album_title are required' });
    }

    // Handle uploaded images (multer.fields produces req.files as an object)
    const images = [];
    const uploadedImages = req.files && req.files['images'];
    if (uploadedImages && uploadedImages.length > 0) {
      uploadedImages.forEach(file => {
        images.push(`/uploads/albums/${file.filename}`);
      });
    }

    // Handle cover image
    let coverImagePath = null;
    const uploadedCover = req.files && req.files['cover_image'];
    if (uploadedCover && uploadedCover.length > 0) {
      coverImagePath = `/uploads/albums/${uploadedCover[0].filename}`;
    }

    const parsedTemplateData = typeof template_data === 'string' ? JSON.parse(template_data) : template_data;
    const parsedPageSettings = typeof page_settings === 'string' ? JSON.parse(page_settings) : (page_settings || []);
    const parsedCoverPage = typeof cover_page === 'string' ? JSON.parse(cover_page) : (cover_page || null);
    const parsedPages = typeof pages === 'string' ? JSON.parse(pages) : (pages || []);

    const album = {
      vendor_id,
      template_id: template_id || null,
      album_title,
      description: description || '',
      price: parseFloat(price) || 0,
      category: category || '',
      images: JSON.stringify(images),
      template_data: parsedTemplateData || null,
      page_settings: parsedPageSettings,
      pages: parsedPages,
      cover_page: parsedCoverPage,
      cover_image: coverImagePath,
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

// Update vendor album (supports adding/removing images and reordering)
const updateVendorAlbum = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const {
      album_title,
      description,
      price,
      category,
      template_id,
      template_data,
      page_settings,
      pages,
      cover_page,
      existing_images, // JSON string array of image paths to KEEP
      image_order,     // JSON array: ["existing:/uploads/albums/x.jpg", "new", "existing:/uploads/albums/y.jpg", "new"]
    } = req.body;

    // Get current album
    const currentAlbum = await db.collection('albums').findOne({ _id: new ObjectId(id) });
    if (!currentAlbum) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Build updated images list respecting order
    let updatedImages = [];

    // req.files is now an object (from multer.fields)
    const uploadedImageFiles = req.files && req.files['images'];

    if (image_order) {
      // New ordering system: interleave existing and new images in user-defined order
      let order;
      try {
        order = typeof image_order === 'string' ? JSON.parse(image_order) : image_order;
      } catch (e) { order = null; }

      if (Array.isArray(order)) {
        let newFileIdx = 0;
        const uploadedPaths = [];
        if (uploadedImageFiles && uploadedImageFiles.length > 0) {
          uploadedImageFiles.forEach(file => {
            uploadedPaths.push(`/uploads/albums/${file.filename}`);
          });
        }

        for (const entry of order) {
          if (entry === 'new') {
            if (newFileIdx < uploadedPaths.length) {
              updatedImages.push(uploadedPaths[newFileIdx]);
              newFileIdx++;
            }
          } else if (typeof entry === 'string' && entry.startsWith('existing:')) {
            const path = entry.replace('existing:', '');
            updatedImages.push(path);
          }
        }
      }
    } else {
      // Fallback: old behavior
      if (existing_images) {
        try {
          const kept = typeof existing_images === 'string' ? JSON.parse(existing_images) : existing_images;
          if (Array.isArray(kept)) updatedImages = kept;
        } catch (e) {
          // ignore parse error
        }
      }

      // Add newly uploaded images at the end
      if (uploadedImageFiles && uploadedImageFiles.length > 0) {
        uploadedImageFiles.forEach(file => {
          updatedImages.push(`/uploads/albums/${file.filename}`);
        });
      }
    }

    // Handle cover image
    let coverImagePath = currentAlbum.cover_image || null;
    const uploadedCover = req.files && req.files['cover_image'];
    if (uploadedCover && uploadedCover.length > 0) {
      coverImagePath = `/uploads/albums/${uploadedCover[0].filename}`;
    }

    const parsedCoverPage = cover_page
      ? (typeof cover_page === 'string' ? JSON.parse(cover_page) : cover_page)
      : (currentAlbum.cover_page || null);

    // Delete removed image files from disk
    const fs = require('fs');
    const path = require('path');
    let oldImages = [];
    try {
      oldImages = typeof currentAlbum.images === 'string' ? JSON.parse(currentAlbum.images) : (currentAlbum.images || []);
    } catch (e) { oldImages = []; }

    oldImages.forEach(oldImg => {
      if (!updatedImages.includes(oldImg)) {
        const filePath = path.join(__dirname, '../../../public', oldImg);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    const parsedTemplateData = template_data
      ? (typeof template_data === 'string' ? JSON.parse(template_data) : template_data)
      : currentAlbum.template_data;

    const updateData = {
      album_title: album_title || currentAlbum.album_title,
      description: description !== undefined ? description : currentAlbum.description,
      price: price !== undefined ? parseFloat(price) || 0 : currentAlbum.price,
      category: category || currentAlbum.category,
      template_id: template_id || currentAlbum.template_id,
      template_data: parsedTemplateData,
      page_settings: page_settings
        ? (typeof page_settings === 'string' ? JSON.parse(page_settings) : page_settings)
        : (currentAlbum.page_settings || []),
      pages: pages
        ? (typeof pages === 'string' ? JSON.parse(pages) : pages)
        : (currentAlbum.pages || []),
      images: JSON.stringify(updatedImages),
      cover_page: parsedCoverPage,
      cover_image: coverImagePath,
      updatedAt: new Date(),
    };

    await db.collection('albums').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.json({ message: 'Album updated successfully', album: { ...currentAlbum, ...updateData, _id: id } });
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

// ======================== PUBLIC ALBUMS ========================

// Helper to check if string is valid ObjectId
const isValidObjectId = (id) => {
  if (!id) return false;
  const str = String(id);
  return /^[0-9a-fA-F]{24}$/.test(str);
};

// Get all published albums (public - no auth needed)
const getPublicAlbums = async (req, res) => {
  const db = getDb();
  try {
    const { category } = req.query;
    // Match albums that are published
    const query = { 
      $or: [
        { publish_status: 'published' },
        { publish_status: 'Published' }
      ]
    };

    if (category && category !== 'All') {
      query.category = category;
    }

    // Fetch albums
    const albums = await db.collection('albums')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch templates and vendors in bulk
    const templateIds = albums
      .filter(a => isValidObjectId(a.template_id))
      .map(a => new ObjectId(a.template_id));
    
    const vendorIds = albums
      .filter(a => isValidObjectId(a.vendor_id))
      .map(a => new ObjectId(String(a.vendor_id)));

    const [templates, vendors] = await Promise.all([
      templateIds.length > 0 
        ? db.collection('album_templates').find({ _id: { $in: templateIds } }).toArray()
        : [],
      vendorIds.length > 0
        ? db.collection('album_vendors').find(
            { _id: { $in: vendorIds } },
            { projection: { businessName: 1, ownerName: 1, phone: 1, logo: 1 } }
          ).toArray()
        : []
    ]);

    // Create lookup maps
    const templateMap = new Map(templates.map(t => [t._id.toString(), t]));
    const vendorMap = new Map(vendors.map(v => [v._id.toString(), v]));

    // Enrich albums with template and vendor data
    const enrichedAlbums = albums.map(album => ({
      ...album,
      template: isValidObjectId(album.template_id) ? templateMap.get(String(album.template_id)) || null : null,
      vendor: isValidObjectId(album.vendor_id) ? vendorMap.get(String(album.vendor_id)) || null : null
    }));

    res.json({ albums: enrichedAlbums });
  } catch (error) {
    console.error('Error fetching public albums:', error);
    res.status(500).json({ error: error.message, albums: [] });
  }
};

// Get single public album by ID
const getPublicAlbumById = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    const albums = await db.collection('albums')
      .aggregate([
        { $match: { _id: new ObjectId(id), publish_status: 'published' } },
        {
          $lookup: {
            from: 'album_templates',
            let: { templateId: { $toObjectId: '$template_id' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$templateId'] } } }
            ],
            as: 'template'
          }
        },
        { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } }
      ])
      .toArray();

    if (!albums.length) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json({ album: albums[0] });
  } catch (error) {
    console.error('Error fetching public album:', error);
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
  deleteVendorAlbum,
  getPublicAlbums,
  getPublicAlbumById
};
