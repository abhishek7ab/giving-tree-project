require('dotenv').config(); // MUST be first

const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userModel = require('./models/userModel');

const db = require('./database/db'); 

const app = express();
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

// SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || 'giving-tree-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

// BODY PARSER
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
    if (!req.session.user) {
      return res.json({ loggedIn: false });
    }

    const stats = await userModel.getUserStats(req.session.user.id);

    const userStats = (stats && stats.length > 0)
      ? stats[0]
      : { total_shared: 0, people_helped: 0 };

    res.json({
      loggedIn: true,
      id: req.session.user.id,
      name: req.session.user.name,
      email: req.session.user.email,
      role: req.session.user.role || 'user',
      stats: userStats
    });

  } catch (err) {
    console.error("❌ USER API ERROR:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
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
  console.log("DB URL:", process.env.DATABASE_URL);
});