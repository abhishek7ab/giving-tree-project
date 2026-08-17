const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set before starting the server.');

function isMasterAdmin(email) {
    if (!email) return false;
    return String(email).toLowerCase().trim() === 'badaveabhishek2004@gmail.com';
}

exports.isLoggedIn = (req, res, next) => {
    const token = req.cookies?.token;
    const isJson = req.headers.accept?.includes('application/json');

    if (!token) {
        if (isJson) return res.status(401).json({ error: 'Not logged in' });
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'admin' || isMasterAdmin(decoded.email)) {
            decoded.role = 'admin';
        }
        req.user = decoded;
        req.session = req.session || {};
        req.session.user = decoded;
        return next();
    } catch (err) {
        if (isJson) return res.status(401).json({ error: 'Invalid token' });
        return res.redirect('/login.html');
    }
};

exports.isAdmin = async (req, res, next) => {
    const token = req.cookies?.token;
    const isJson = req.headers.accept?.includes('application/json');

    if (!token) {
        if (isJson) return res.status(401).json({ error: 'Not logged in' });
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.session = req.session || {};
        req.session.user = decoded;

        if (decoded.role === 'admin' || isMasterAdmin(decoded.email)) {
            req.user.role = 'admin';
            return next();
        }

        // Check DB in case role was updated after token creation
        const db = require('../database/db');
        const userRes = await db.query('SELECT role, email FROM users WHERE id = $1', [decoded.id]);
        const dbUser = userRes.rows[0];
        if (dbUser?.role === 'admin' || isMasterAdmin(dbUser?.email)) {
            req.user.role = 'admin';
            return next();
        }

        if (isJson) return res.status(403).json({ error: 'Admin access required' });
        return res.redirect('/login.html?error=adminonly');
    } catch (err) {
        if (isJson) return res.status(401).json({ error: 'Session expired' });
        return res.redirect('/login.html');
    }
};
