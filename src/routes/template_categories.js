const express = require('express');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Get all template categories
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const categories = await db.collection('template_categories')
      .find({ _init: { $exists: false } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single template category
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const category = await db.collection('template_categories').findOne({
      _id: new ObjectId(req.params.id)
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create template category
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const { name, description, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const newCategory = {
      name,
      description: description || '',
      status: status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('template_categories').insertOne(newCategory);
    res.status(201).json({
      message: 'Category created successfully',
      category: { _id: result.insertedId, ...newCategory }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update template category
router.put('/:id', async (req, res) => {
  try {
    const db = getDb();
    const { name, description, status } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (status !== undefined) updateFields.status = status;
    updateFields.updatedAt = new Date();

    const result = await db.collection('template_categories').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete template category
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('template_categories').deleteOne({
      _id: new ObjectId(req.params.id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
