const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'giving-tree-jwt-secret-2024';

exports.isLoggedIn = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) return res.redirect('/login');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.session = req.session || {};
        req.session.user = decoded;
        return next();
    } catch (err) {
        return res.redirect('/login');
    }
};

exports.isAdmin = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) return res.redirect('/login');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.session = req.session || {};
        req.session.user = decoded;

        if (decoded.role === 'admin') return next();
        return res.status(403).send("<h1>403 Access Denied</h1>");
    } catch (err) {
        return res.redirect('/login');
    }
};