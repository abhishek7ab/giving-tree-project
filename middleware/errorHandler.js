/**
 * Global Defensive Error Handler Middleware
 * Prevents information disclosure (DB details, stack traces, path traversal leaks)
 */

const errorHandler = (err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const statusCode = err.status || err.statusCode || 500;

    // Log the full technical error on the server
    console.error(`[SERVER_ERROR] [${req.method} ${req.url}]:`, err);

    // Build safe client response
    const clientResponse = {
        success: false,
        error: statusCode === 500 ? 'InternalServerError' : (err.name || 'Error'),
        message: (isProduction && statusCode === 500)
            ? 'An unexpected error occurred. Please try again later.'
            : (err.message || 'Something went wrong.')
    };

    // Return JSON or redirect gracefully
    if (req.headers.accept?.includes('application/json') || req.xhr || req.url.startsWith('/api/')) {
        return res.status(statusCode).json(clientResponse);
    }

    // Otherwise render or fallback
    return res.status(statusCode).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Error | Giving Tree</title>
            <style>
                body { background:#090D16; color:#fff; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; }
                .card { background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.1); padding:40px; border-radius:18px; max-width:400px; }
                a { color:#10B981; text-decoration:none; font-weight:bold; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>Something went wrong</h2>
                <p style="color:#94A3B8;">${clientResponse.message}</p>
                <a href="/">← Return Home</a>
            </div>
        </body>
        </html>
    `);
};

module.exports = errorHandler;
