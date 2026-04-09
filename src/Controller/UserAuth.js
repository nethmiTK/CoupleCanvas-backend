const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/mongo');
const { ObjectId } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'CoupleCanvas_Super_Secure_2026_Key';

const registerUser = async (req, res) => {
  const db = getDb();
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const existing = await db.collection('users').findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertedId,
    });
  } catch (err) {
    console.error('User register error:', err);
    res.status(500).json({ error: err.message });
  }
};

const loginUser = async (req, res) => {
  const db = getDb();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('User login error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerUser, loginUser };