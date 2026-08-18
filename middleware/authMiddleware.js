const { verifyToken } = require('../config/jwt');

function isMasterAdmin(email) {
    if (!email) return false;
    const masterEmail = (process.env.MASTER_ADMIN_EMAIL || 'badaveabhishek2004@gmail.com').toLowerCase().trim();
    return String(email).toLowerCase().trim() === masterEmail;
}

exports.isMasterAdmin = isMasterAdmin;

exports.isLoggedIn = (req, res, next) => {
    const token = req.cookies?.token;
    const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');

    if (!token) {
        if (isJson) return res.status(401).json({ error: 'Not logged in' });
        return res.redirect('/login.html');
    }

    try {
        const decoded = verifyToken(token);
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
    const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');

    if (!token) {
        if (isJson) return res.status(401).json({ error: 'Not logged in' });
        return res.redirect('/login.html');
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        req.session = req.session || {};
        req.session.user = decoded;

        // Live database verification: enforce active, unarchived admin status
        const db = require('../database/db');
        const userRes = await db.query(
            'SELECT id, name, email, role, archived_at FROM users WHERE id = $1',
            [decoded.id]
        );
        const dbUser = userRes.rows[0];

        if (!dbUser || dbUser.archived_at) {
            if (isJson) return res.status(401).json({ error: 'User account is inactive or disabled.' });
            return res.redirect('/login.html?error=accountdisabled');
        }

        const isMaster = isMasterAdmin(dbUser.email);
        if (dbUser.role === 'admin' || isMaster) {
            req.user.role = 'admin';
            req.user.isMasterAdmin = isMaster;
            return next();
        }

        if (isJson) return res.status(403).json({ error: 'Admin access required' });
        return res.redirect('/login.html?error=adminonly');
    } catch (err) {
        if (isJson) return res.status(401).json({ error: 'Session expired' });
        return res.redirect('/login.html');
    }
};
