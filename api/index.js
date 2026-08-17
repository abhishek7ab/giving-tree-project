const app = require('../server');

module.exports = (req, res) => {
  // Normalize URL if Vercel serverless rewrite prefixed /api/index.js or /api/index
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.slice('/api/index.js'.length) || '/';
  } else if (req.url.startsWith('/api/index')) {
    req.url = req.url.slice('/api/index'.length) || '/';
  }
  return app(req, res);
};
