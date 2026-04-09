const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/mongo');

const JWT_SECRET = process.env.JWT_SECRET || 'CoupleCanvas_Super_Secure_2026_Key';

const registerPhotographer = async (req, res) => {
  const db = getDb();
  try {
    const { name, email, password, phone, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const existing = await db.collection('photographers').findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.collection('photographers').insertOne({
      name,
      email,
      password: hashedPassword,
      phone: phone || '',
      bio: bio || '',
      profilePic: '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: 'Photographer registered. Awaiting admin approval.',
      photographerId: result.insertedId,
    });
  } catch (err) {
    console.error('Photographer register error:', err);
    res.status(500).json({ error: err.message });
  }
};

const loginPhotographer = async (req, res) => {
  const db = getDb();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const photographer = await db.collection('photographers').findOne({ email });
    if (!photographer) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (photographer.status !== 'active') {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    const valid = await bcrypt.compare(password, photographer.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: photographer._id, email: photographer.email, role: 'photographer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      photographer: {
        id: photographer._id,
        name: photographer.name,
        email: photographer.email,
        phone: photographer.phone,
        bio: photographer.bio,
        profilePic: photographer.profilePic,
      },
    });
  } catch (err) {
    console.error('Photographer login error:', err);
    res.status(500).json({ error: err.message });
  }
};

const updatePhotographerProfile = async (req, res) => {
  const db = getDb();
  try {
    const { name, phone, bio } = req.body;
    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;

    await db.collection('photographers').updateOne(
      { _id: new (require('mongodb').ObjectId)(req.user.id) },
      { $set: updateData }
    );

    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerPhotographer, loginPhotographer, updatePhotographerProfile };