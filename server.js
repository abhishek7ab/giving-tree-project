const express = require('express');
const session = require('express-session');
const path = require('path');

// --- ROUTE IMPORTS ---
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userModel = require('./models/userModel');

const app = express();

// ✅ FIXED PORT FOR RENDER
const PORT = process.env.PORT || 3000;

// --- 1. SESSION SETUP ---
app.use(session({
    secret: 'giving-tree-secret-key-99',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- 2. BODY PARSERS ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 3. STATIC FILES ---
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'assets/uploads')));

// --- 4. ROUTES ---
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);

// --- 5. USER API ---
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        userModel.getUserStats(req.session.user.id, (err, stats) => {
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
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- 6. HOME PAGE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages/index.html'));
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`🌳 GIVING TREE SERVER IS LIVE`);
    console.log(`🚀 Running on port: ${PORT}`);
    console.log(`===========================================`);
});