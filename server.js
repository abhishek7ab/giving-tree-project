require('dotenv').config(); // MUST be first

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userModel = require('./models/userModel');

const db = require('./database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'giving-tree-jwt-secret-2024';

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// 🔥 TEST DB CONNECTION
(async () => {
  try {
    await db.query('SELECT 1');
    console.log("✅ Database Connected Successfully");
  } catch (err) {
    console.error("❌ Database Connection Failed:", err.message);
  }
})();

// MIDDLEWARE
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// STATIC FILES
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'assets/uploads')));

// ROUTES
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);

// USER API
app.get('/api/user', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.json({ loggedIn: false });

    const decoded = jwt.verify(token, JWT_SECRET);
    const stats = await userModel.getUserStats(decoded.id);
    const userStats = (stats && stats.length > 0)
      ? stats[0]
      : { total_shared: 0, people_helped: 0 };

    res.json({
      loggedIn: true,
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role || 'user',
      stats: userStats
    });

  } catch (err) {
    console.error("❌ USER API ERROR:", err.message);
    res.json({ loggedIn: false });
  }
});

// HOME
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages/index.html'));
});

// START SERVER
app.listen(PORT, () => {
  console.log("===========================================");
  console.log("🌳 GIVING TREE SERVER IS LIVE");
  console.log(`🚀 Running on port: ${PORT}`);
  console.log("===========================================");
});

module.exports = app;