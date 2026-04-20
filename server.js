require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userModel = require('./models/userModel');
const db = require('./database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'giving-tree-jwt-secret-2024';

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: '*',
  credentials: true
}));

// 🔥 IMPORTANT: Body Parsers MUST come before routes
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Routes
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);

// User API
app.get('/api/user', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.json({ loggedIn: false });

    const decoded = jwt.verify(token, JWT_SECRET);
    const stats = await userModel.getUserStats(decoded.id);
    const userStats = (stats && stats.length > 0) ? stats[0] : { total_shared: 0, people_helped: 0 };

    res.json({
      loggedIn: true,
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role || 'user',
      stats: userStats
    });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pages/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;