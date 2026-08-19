/**
 * Origin & Referer CSRF Validation Middleware
 * Validates that mutating requests originate exclusively from trusted host domains
 */

const FRONTEND_URL = process.env.FRONTEND_URL || '';
const ALLOWED_DOMAINS = [
    'giving-tree-project.vercel.app',
    'localhost',
    '127.0.0.1'
];

if (process.env.ADDITIONAL_ORIGINS) {
    process.env.ADDITIONAL_ORIGINS.split(',').forEach(item => {
        const clean = item.trim().replace(/^https?:\/\//, '').replace(/:\d+$/, '');
        if (clean) ALLOWED_DOMAINS.push(clean);
    });
}

function isOriginAllowed(originUrl) {
    if (!originUrl) return true; // Direct non-browser or internal requests
    try {
        const parsed = new URL(originUrl);
        const hostname = parsed.hostname.toLowerCase();

        return (
            ALLOWED_DOMAINS.includes(hostname) ||
            hostname.endsWith('.vercel.app') ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1'
        );
    } catch {
        return false;
    }
}

const csrfProtection = (req, res, next) => {
    // Only check mutating requests (POST, PUT, PATCH, DELETE)
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(req.method)) {
        return next();
    }

    const origin = req.headers['origin'];
    const referer = req.headers['referer'];

    // In test environment, skip strict origin checking
    if (process.env.NODE_ENV === 'test') {
        return next();
    }

    if (origin && !isOriginAllowed(origin)) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Cross-origin request blocked by CSRF security policy.'
        });
    }

    if (!origin && referer && !isOriginAllowed(referer)) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Cross-origin referer blocked by CSRF security policy.'
        });
    }

    next();
};

module.exports = {
    csrfProtection,
    isOriginAllowed
};
