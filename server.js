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

const JWT_SECRET = process.env.JWT_SECRET || 'giving-tree-jwt-secret-2024';

const app = express();
app.set('trust proxy', 1);

// ✅ Detect environment
const isProduction = process.env.NODE_ENV === 'production';

// ✅ Dynamic frontend URL
const FRONTEND_URL = isProduction
  ? "https://giving-tree-frontend.vercel.app"
  : "http://localhost:3001"; // change if your frontend runs on another port

// ✅ CORS (fixed properly)
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// ✅ Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ✅ Routes
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);

// ✅ API
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
      role: decoded.role || 'user',
      stats: userStats
    });

  } catch (err) {
    console.error("USER API ERROR:", err.message);
    res.json({ loggedIn: false });
  }
});

// ✅ Home route
app.get('/', (req, res) => {
  return res.redirect(`${FRONTEND_URL}/index.html`);
});

// ✅ Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Mode: ${isProduction ? "Production" : "Development"}`);
});

module.exports = app;