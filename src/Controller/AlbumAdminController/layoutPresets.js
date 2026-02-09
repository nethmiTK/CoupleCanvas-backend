const { getDb } = require('../../db/mongo');
const { ObjectId } = require('mongodb');

// Get all layout presets
const getAllPresets = async (req, res) => {
  const db = getDb();
  try {
    const { type, search, status, pageCount } = req.query;

    const filter = {};
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (pageCount) {
      filter.pageCount = parseInt(pageCount);
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { label: { $regex: search, $options: 'i' } }
      ];
    }

    const presets = await db.collection('layout_presets')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ 
      success: true, 
      presets,
      count: presets.length 
    });
  } catch (error) {
    console.error('Error fetching presets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch presets' });
  }
};

// Get single preset by ID
const getPresetById = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid preset ID' });
    }

    const preset = await db.collection('layout_presets').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    res.json({ success: true, preset });
  } catch (error) {
    console.error('Error fetching preset:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preset' });
  }
};

// Create new layout preset
const createPreset = async (req, res) => {
  const db = getDb();
  try {
    const { 
      name, 
      label, 
      type, 
      slots, 
      thumbnail, 
      pageCount, 
      layoutJson, 
      bgColor 
    } = req.body;

    // Validate required fields
    if (!name || !label) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and label are required' 
      });
    }

    // Check if name already exists
    const existing = await db.collection('layout_presets').findOne({ name });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Preset with this name already exists' 
      });
    }

    const newPreset = {
      name,
      label,
      type: type || 'grid',
      slots: parseInt(slots) || 1,
      thumbnail: thumbnail || '🆕',
      pageCount: parseInt(pageCount) || 20,
      layoutJson: layoutJson || { elements: [] },
      bgColor: bgColor || '#FFFFFF',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('layout_presets').insertOne(newPreset);

    res.status(201).json({ 
      success: true, 
      message: 'Preset created successfully',
      preset: { ...newPreset, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating preset:', error);
    res.status(500).json({ success: false, error: 'Failed to create preset' });
  }
};

// Update layout preset
const updatePreset = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid preset ID' });
    }

    // Remove _id from updateData if present
    delete updateData._id;

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const result = await db.collection('layout_presets').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    res.json({ 
      success: true, 
      message: 'Preset updated successfully',
      preset: result
    });
  } catch (error) {
    console.error('Error updating preset:', error);
    res.status(500).json({ success: false, error: 'Failed to update preset' });
  }
};

// Delete layout preset
const deletePreset = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid preset ID' });
    }

    const result = await db.collection('layout_presets').deleteOne({ 
      _id: new ObjectId(id) 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    res.json({ 
      success: true, 
      message: 'Preset deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting preset:', error);
    res.status(500).json({ success: false, error: 'Failed to delete preset' });
  }
};

// Duplicate preset
const duplicatePreset = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid preset ID' });
    }

    const original = await db.collection('layout_presets').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!original) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    // Create duplicate with new name
    const duplicate = {
      ...original,
      name: `${original.name}_copy_${Date.now()}`,
      label: `${original.label} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    delete duplicate._id;

    const result = await db.collection('layout_presets').insertOne(duplicate);

    res.status(201).json({ 
      success: true, 
      message: 'Preset duplicated successfully',
      preset: { ...duplicate, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error duplicating preset:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate preset' });
  }
};

// Toggle preset status (active/inactive)
const togglePresetStatus = async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid preset ID' });
    }

    const preset = await db.collection('layout_presets').findOne({ 
      _id: new ObjectId(id) 
    });

    if (!preset) {
      return res.status(404).json({ success: false, error: 'Preset not found' });
    }

    const newStatus = preset.status === 'active' ? 'inactive' : 'active';

    const result = await db.collection('layout_presets').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: newStatus,
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    res.json({ 
      success: true, 
      message: `Preset ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
      preset: result
    });
  } catch (error) {
    console.error('Error toggling preset status:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle status' });
  }
};

module.exports = {
  getAllPresets,
  getPresetById,
  createPreset,
  updatePreset,
  deletePreset,
  duplicatePreset,
  togglePresetStatus
};
