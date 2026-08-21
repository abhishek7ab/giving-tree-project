require('dotenv').config();

const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const pino = require('pino');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');
const wishRoutes = require('./routes/wishRoutes');
const userModel = require('./models/userModel');
const requestController = require('./controllers/requestController');
const db = require('./database/db');
const initDB = require('./database/init');
const requestModel = require('./models/requestModel');
const { verifyToken } = require('./config/jwt');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ✅ Dynamic frontend URL & Allowed Origins
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;
const allowedOrigins = [FRONTEND_URL];
if (process.env.ADDITIONAL_ORIGINS) {
  allowedOrigins.push(...process.env.ADDITIONAL_ORIGINS.split(',').map(s => s.trim()).filter(Boolean));
}

// ✅ Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "blob:"],
      scriptSrcAttr: ["'unsafe-hashes'", "'unsafe-inline'"],
      workerSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.tile.openstreetmap.org", "https://tile.openstreetmap.org", "https://*.basemaps.cartocdn.com", "https://basemaps.cartocdn.com", "https://*.unsplash.com", "https://images.unsplash.com", "https://res.cloudinary.com", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", "https://api.cloudinary.com", "https://nominatim.openstreetmap.org", "https://*.basemaps.cartocdn.com", "https://basemaps.cartocdn.com", "https://*.tile.openstreetmap.org", "https://tile.openstreetmap.org", "https://tiles.openfreemap.org", "wss:", "ws:"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// Additional Defensive Security Headers
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// ✅ CORS — strictly validate origins
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === 'null' ||
      process.env.NODE_ENV !== 'production' ||
      origin.endsWith('.vercel.app') ||
      allowedOrigins.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, false); // Explicitly reject disallowed origin
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// Handle preflight requests globally
app.options(/(.*)/, cors());

// ✅ Rate limiting
const isDev = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

const actionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 60,
  message: { error: 'Too many actions performed, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 5000 : 300,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 100,
  message: { error: 'Too many administrative requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

app.post('/login', authLimiter);
app.post('/register', authLimiter);
app.post('/api/user/change-password', authLimiter);
app.post('/make-me-admin', authLimiter);
app.post('/post-item', actionLimiter);
app.post('/request-item', actionLimiter);
app.post('/api/reviews', actionLimiter);
app.post('/api/wishes', actionLimiter);
app.use('/admin/', adminLimiter);
app.use('/api/admin/', adminLimiter);
app.use('/api/', apiLimiter);

// ✅ Middlewares
const { deepSanitize } = require('./middleware/sanitize');
const { csrfProtection } = require('./middleware/csrfProtection');
const errorHandler = require('./middleware/errorHandler');

app.use((req, res, next) => {
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.slice('/api/index.js'.length) || '/';
  } else if (req.url.startsWith('/api/index')) {
    req.url = req.url.slice('/api/index'.length) || '/';
  }
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(hpp());
app.use(deepSanitize);
app.use(csrfProtection);

// ✅ Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.url, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
});

// ✅ Static files with no-cache on HTML for live instant updates
const fs = require('fs');
const frontendPath = fs.existsSync(path.join(__dirname, 'frontend'))
  ? path.join(__dirname, 'frontend')
  : path.join(process.cwd(), 'frontend');

app.use(express.static(frontendPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));
app.use('/uploads', express.static(path.join(frontendPath, 'assets', 'uploads')));

// ✅ Routes
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);
app.use('/', wishRoutes);

// ✅ Global Defensive Error Handler
app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === 'null' ||
        process.env.NODE_ENV !== 'production' ||
        origin.endsWith('.vercel.app') ||
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
  }
});
requestController.setSocketIO(io);
const adminNotifier = require('./utils/adminNotifier');
adminNotifier.setSocketIO(io);

// Socket.io Handshake Authentication Middleware
io.use((socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie || '';
    const cookies = rawCookie.split(';').reduce((acc, c) => {
      const [key, ...v] = c.trim().split('=');
      if (key) acc[key] = decodeURIComponent(v.join('='));
      return acc;
    }, {});
    const token = cookies.token || socket.handshake.auth?.token;
    if (token) {
      const decoded = verifyToken(token);
      socket.user = decoded;
    }
  } catch (err) {
    socket.user = null;
  }
  next();
});

io.on('connection', (socket) => {
  socket.on('join-user', (email) => {
    const roomEmail = String(email || '').trim().toLowerCase();
    // Only allow user to join their own notification channel (or if admin)
    if (socket.user && roomEmail) {
      const authEmail = String(socket.user.email || '').trim().toLowerCase();
      const isAdmin = socket.user.role === 'admin' || authEmail === 'badaveabhishek2004@gmail.com';
      if (authEmail === roomEmail || isAdmin) {
        socket.join(`user:${roomEmail}`);
      }
    }
  });

  socket.on('join-request', async (requestId) => {
    const parsed = Number(requestId);
    if (!parsed || !socket.user) return;
    try {
      const requestDetails = await requestModel.getRequestWithOwnerById(parsed);
      if (!requestDetails) return;
      const userEmail = String(socket.user.email || '').trim().toLowerCase();
      const isAdmin = socket.user.role === 'admin' || userEmail === 'badaveabhishek2004@gmail.com';
      const isOwner = userEmail && userEmail === String(requestDetails.owner_email || '').trim().toLowerCase();
      const isRequester = userEmail && userEmail === String(requestDetails.requester_email || '').trim().toLowerCase();
      if (isAdmin || isOwner || isRequester) {
        socket.join(`request:${parsed}`);
      }
    } catch (e) {
      logger.error({ err: e }, "Socket join-request error");
    }
  });
});

// ✅ API
app.get('/api/user', async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) return res.json({ loggedIn: false });

    const decoded = verifyToken(token);

    let userStats = { total_shared: 0, people_helped: 0 };
    if (typeof userModel.getUserStats === 'function') {
        try {
            const stats = await userModel.getUserStats(decoded.id);
            if (stats && stats.length > 0) userStats = stats[0];
        } catch(e) {
            console.error("Error fetching stats:", e);
        }
    }

    // Fetch user's latest details from DB if available
    let city = decoded.city || 'Kothrud, Pune';
    let lat = null;
    let lng = null;
    let userRole = decoded.role || 'user';
    let userName = decoded.name || 'Neighbor';
    try {
        const userRes = await db.query("SELECT name, role, city, latitude, longitude FROM users WHERE id = $1 AND archived_at IS NULL", [decoded.id]);
        if (userRes.rows.length) {
            const row = userRes.rows[0];
            city = row.city || city;
            lat = row.latitude;
            lng = row.longitude;
            if (row.role) userRole = row.role;
            if (row.name) userName = row.name;
        }
    } catch(e) {
        console.error("Error fetching user location:", e);
    }

    res.json({
      loggedIn: true,
      id: decoded.id,
      role: userRole,
      name: userName,
      email: decoded.email || 'user@local.com',
      city: city,
      latitude: lat,
      longitude: lng,
      stats: userStats
    });

  } catch (err) {
    console.error("USER API ERROR:", err.message);
    res.json({ loggedIn: false });
  }
});

// ✅ Public community stats
app.get('/api/stats', async (req, res) => {
  try {
    const itemsResult = await db.query("SELECT COUNT(*) AS count FROM items WHERE archived_at IS NULL");
    const usersResult = await db.query("SELECT COUNT(*) AS count FROM users WHERE archived_at IS NULL");
    const completedResult = await db.query("SELECT COUNT(*) AS count FROM requests WHERE LOWER(status) = 'completed'");
    const itemsShared = parseInt(itemsResult.rows[0]?.count) || 0;
    const members = parseInt(usersResult.rows[0]?.count) || 0;
    const completed = parseInt(completedResult.rows[0]?.count) || 0;
    res.json({
      items_shared: itemsShared,
      members: members,
      completed: completed,
      totalItems: itemsShared,
      totalMembers: members,
      totalShared: itemsShared,
      totalCompleted: completed
    });
  } catch (err) {
    console.error("STATS API ERROR:", err.message);
    res.json({ items_shared: 0, members: 0, completed: 0, totalItems: 0, totalMembers: 0, totalShared: 0, totalCompleted: 0 });
  }
});

// ✅ Health check endpoint
app.get('/healthz', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: true, timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, 'Health check failed');
    res.status(503).json({ status: 'degraded', db: false, timestamp: new Date().toISOString() });
  }
});

// ✅ Environment validation
const { z } = require('zod');
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(8).optional(),
  FRONTEND_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  ADMIN_SETUP_KEY: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function validateEnv() {
  try {
    envSchema.parse(process.env);
    logger.info('Environment validation passed');
  } catch (err) {
    logger.warn({ err: err.flatten() }, 'Environment validation warning');
  }
}

validateEnv();

// ✅ Global Express Error Handler
app.use((err, req, res, next) => {
  logger.error({ err: err.message || err, stack: err.stack }, 'Application error handler caught');
  if (res.headersSent) return next(err);

  const isProduction = process.env.NODE_ENV === 'production';
  const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
  const safeMessage = isProduction ? 'An unexpected error occurred. Please try again later.' : (err.message || 'Internal Server Error');

  if (isJson) {
    return res.status(500).json({ error: 'servererror', message: safeMessage });
  }
  return res.status(500).send(safeMessage);
});

// ✅ Start server (only when executed directly, e.g. local dev; skipped on Vercel/tests)
let PORT = process.env.PORT || 3000;

function startServer(port) {
    initDB().catch(err => {
        logger.warn({ err: err.message || err }, "Database initialization note (DB connection pending or offline)");
    }).finally(() => {
        server.listen(port, () => {
            console.log(`\n==================================================`);
            console.log(`🚀 Giving Tree Server is Live!`);
            console.log(`👉 Home Page:  http://localhost:${port}/index.html`);
            console.log(`👉 Login Page: http://localhost:${port}/login.html`);
            console.log(`==================================================\n`);
            logger.info(`🚀 Server running on http://localhost:${port}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.warn(`⚠️ Port ${port} is in use, trying port ${port + 1}...`);
                startServer(port + 1);
            } else {
                logger.error({ err }, "Server error");
            }
        });
    });
}

let dbInitPromise = null;
function ensureDBInit() {
    if (!dbInitPromise) {
        dbInitPromise = initDB().catch(err => {
            logger.warn({ err: err.message || err }, "Database initialization note (DB connection pending or offline)");
        });
    }
    return dbInitPromise;
}

if (require.main === module) {
    startServer(PORT);
} else {
    // Non-blocking initialization on serverless startup
    ensureDBInit();
}

module.exports = app;
