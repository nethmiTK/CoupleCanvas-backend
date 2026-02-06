const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

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

app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
});