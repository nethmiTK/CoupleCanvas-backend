require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const statsRoutes = require('./routes/stats');
const albumRoutes = require('./routes/albums');
const videoRoutes = require('./routes/videos');

const allowedOrigins = [
  'http://memoalbum.com',
  'http://www.memoalbum.com',
  'https://memoalbum.com',
  'https://www.memoalbum.com',
  'https://admin.memoalbum.com',
  'http://admin.memoalbum.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api', statsRoutes);
app.use('/api', albumRoutes);
app.use('/api', videoRoutes);

const admins = [
  { id: '1', email: 'admin@couplecanvas.com', password: 'admin123', name: 'Admin User' }
];

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  const admin = admins.find(a => a.email === email && a.password === password);
  
  if (admin) {
    res.json({
      token: 'admin-token-' + Date.now(),
      admin: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/admin/signup', (req, res) => {
  const { name, email, password } = req.body;
  const newAdmin = { id: Date.now().toString(), name, email, password };
  admins.push(newAdmin);
  res.json({ message: 'Admin created successfully' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend running on port ${PORT}`);
});