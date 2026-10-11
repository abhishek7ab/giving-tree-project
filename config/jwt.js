const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const DEFAULT_SECRET = 'giving_tree_default_jwt_secret_pune_2026_safe_32_chars';
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === DEFAULT_SECRET || JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        console.warn('⚠️ WARNING: JWT_SECRET is not configured with >= 32 chars in production. Generating an ephemeral cryptographically secure 256-bit runtime secret. For persistent user sessions across reboots, add JWT_SECRET to your Render environment variables.');
        JWT_SECRET = crypto.randomBytes(32).toString('hex');
    } else {
        JWT_SECRET = DEFAULT_SECRET;
    }
}

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
