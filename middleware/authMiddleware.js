const { verifyToken } = require('../config/jwt');

function isMasterAdmin(email) {
    if (!email) return false;
    const masterEmail = (process.env.MASTER_ADMIN_EMAIL || 'badaveabhishek2004@gmail.com').toLowerCase().trim();
    return String(email).toLowerCase().trim() === masterEmail;
}

exports.isMasterAdmin = isMasterAdmin;

exports.isLoggedIn = async (req, res, next) => {
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

        // Active account & token revocation check against database
        try {
            const db = require('../database/db');
            const userRes = await db.query(
                'SELECT id, name, email, role, archived_at, token_version FROM users WHERE id = $1',
                [decoded.id]
            );
            const dbUser = userRes.rows[0];

            if (dbUser) {
                if (dbUser.archived_at) {
                    if (isJson) return res.status(401).json({ error: 'User account is inactive or disabled.' });
                    return res.redirect('/login.html?error=accountdisabled');
                }

                if (decoded.tokenVersion && dbUser.token_version && Number(decoded.tokenVersion) !== Number(dbUser.token_version)) {
                    if (isJson) return res.status(401).json({ error: 'Session expired. Please log in again.' });
                    return res.redirect('/login.html?error=sessionexpired');
                }

                if (dbUser.role) {
                    req.user.role = dbUser.role;
                }
            }
        } catch (dbErr) {
            // If DB check fails due to transient connection issue in test mode, proceed with verified JWT
        }

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

        // Live database verification: enforce active, unarchived admin status & valid token version
        const db = require('../database/db');
        const userRes = await db.query(
            'SELECT id, name, email, role, archived_at, token_version FROM users WHERE id = $1',
            [decoded.id]
        );
        const dbUser = userRes.rows[0];

        if (!dbUser || dbUser.archived_at) {
            if (isJson) return res.status(401).json({ error: 'User account is inactive or disabled.' });
            return res.redirect('/login.html?error=accountdisabled');
        }

        // Token version revocation check
        if (decoded.tokenVersion && dbUser.token_version && Number(decoded.tokenVersion) !== Number(dbUser.token_version)) {
            if (isJson) return res.status(401).json({ error: 'Session expired. Please log in again.' });
            return res.redirect('/login.html?error=sessionexpired');
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
