const jwt = require('jsonwebtoken');

const DEFAULT_SECRET = 'giving_tree_default_jwt_secret_pune_2026_safe_32_chars';
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET must be configured with a strong value of at least 32 characters in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

function signToken(payload, options = {}) {
    const defaultOptions = { expiresIn: '7d' };
    return jwt.sign(payload, JWT_SECRET, { ...defaultOptions, ...options });
}

function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = {
    JWT_SECRET,
    signToken,
    verifyToken,
};
