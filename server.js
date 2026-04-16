const express = require('express');
const session = require('express-session');
const path = require('path');

// --- ROUTE IMPORTS ---
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');

const app = express();
const PORT = 3000;

// --- 1. SESSION SETUP (Must be before routes) ---
app.use(session({
    secret: 'giving-tree-secret-key-99',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Session lasts 24 hours
}));

// --- 2. BODY PARSERS ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Added to support modern API requests

// --- 3. STATIC FILES (THE FIX FOR YOUR "DULL" LOOK) ---
// This serves EVERYTHING inside your assets folder (style, js, images)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Specifically serving the uploads folder so item images show up
app.use('/uploads', express.static(path.join(__dirname, 'assets/uploads')));

// --- 4. ROUTES ---
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);

// --- 5. USER API (Updated with Stats) ---
const userModel = require('./models/userModel'); // Add this line at the top
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        // Fetch real-time stats from the database
        userModel.getUserStats(req.session.user.id, (err, stats) => {
            const userStats = (stats && stats.length > 0) ? stats[0] : { total_shared: 0, people_helped: 0 };
            
            res.json({
                loggedIn: true,
                id: req.session.user.id,
                name: req.session.user.name,
                email: req.session.user.email,
                role: req.session.user.role || 'user',
                stats: userStats // This sends the numbers to the Home Page
            });
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- 6. HOME PAGE ---
// ... (Previous routes) ...

// --- 5. USER API (Updated with Stats) ---
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        userModel.getUserStats(req.session.user.id, (err, stats) => {
            const userStats = (stats && stats.length > 0) ? stats[0] : { total_shared: 0, people_helped: 0 };
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
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`===========================================`);
});