/**
 * Deep Input Sanitization Middleware
 * Defense-in-depth against XSS, Prototype Pollution, Null-Byte injections, and Control Characters
 */

function sanitizeValue(value) {
    if (typeof value === 'string') {
        // 1. Remove Null Bytes and control characters
        let clean = value.replace(/\0/g, '').replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
        
        // 2. Strip dangerous script / event handler vectors while keeping normal text clean
        clean = clean
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/vbscript:/gi, '')
            .replace(/data:text\/html/gi, '')
            .replace(/on\w+\s*=/gi, '');

        return clean.trim();
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (value !== null && typeof value === 'object') {
        const cleanObj = {};
        for (const [key, val] of Object.entries(value)) {
            // Protect against prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }
            cleanObj[key] = sanitizeValue(val);
        }
        return cleanObj;
    }

    return value;
}

const deepSanitize = (req, res, next) => {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.params) req.params = sanitizeValue(req.params);
    next();
};

module.exports = {
    deepSanitize,
    sanitizeValue
};
