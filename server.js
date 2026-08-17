require('dotenv').config();

const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const pino = require('pino');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userModel = require('./models/userModel');
const requestController = require('./controllers/requestController');
const db = require('./database/db');
const initDB = require('./database/init');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set before starting the server.');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);

// ✅ Dynamic frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3000}`;

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
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

// ✅ CORS — must come BEFORE routes and rate limiters
const allowedOrigins = [FRONTEND_URL];
if (process.env.ADDITIONAL_ORIGINS) {
  allowedOrigins.push(...process.env.ADDITIONAL_ORIGINS.split(','));
}

// Always allow localhost & 127.0.0.1 variants on any port in development for convenience
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin, 'null' string origin, or in development mode
    if (!origin || origin === 'null' || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
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
  max: isDev ? 1000 : 25,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDev ? 5000 : 120,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', authLimiter);
app.post('/register', authLimiter);
app.use('/api/', apiLimiter);

// ✅ Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, url: req.url, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
});

// ✅ Ensure database initialization (for both serverless cold-starts & standalone)
let dbInitPromise = null;
function ensureDbInit() {
  if (!dbInitPromise) {
    dbInitPromise = initDB().catch((err) => {
      logger.error({ err }, 'Failed to initialize DB schema');
      dbInitPromise = null;
    });
  }
  return dbInitPromise;
}

app.use(async (req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    try {
      await ensureDbInit();
    } catch (e) {
      // Proceed; route handlers handle DB connection issues appropriately
    }
  }
  next();
});

// ✅ Static files with no-cache on HTML for live instant updates
app.use(express.static(path.join(__dirname, 'frontend'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// ✅ Routes
app.use('/', authRoutes);
app.use('/', itemRoutes);
app.use('/', requestRoutes);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true
  }
});
requestController.setSocketIO(io);

io.on('connection', (socket) => {
  socket.on('join-user', (email) => {
    const roomEmail = String(email || '').trim().toLowerCase();
    if (roomEmail) socket.join(`user:${roomEmail}`);
  });

  socket.on('join-request', (requestId) => {
    const parsed = Number(requestId);
    if (parsed) socket.join(`request:${parsed}`);
  });
});

// ✅ API
app.get('/api/user', async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) return res.json({ loggedIn: false });

    const decoded = jwt.verify(token, JWT_SECRET);

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
    res.json({
      items_shared: parseInt(itemsResult.rows[0].count) || 0,
      members: parseInt(usersResult.rows[0].count) || 0,
      completed: parseInt(completedResult.rows[0].count) || 0
    });
  } catch (err) {
    console.error("STATS API ERROR:", err.message);
    res.json({ items_shared: 0, members: 0, completed: 0 });
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
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().optional(),
  DATABASE_URL: z.string().url(),
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
    logger.error({ err: err.flatten() }, 'Environment validation failed');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateEnv();

// ✅ Start server (only when executed directly, e.g. local dev; skipped on Vercel/tests)
let PORT = process.env.PORT || 3000;

function startServer(port) {
    initDB().then(() => {
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
    }).catch(err => {
        logger.error({ err }, "Failed to initialize DB schema");
    });
}

if (require.main === module) {
    startServer(PORT);
}

module.exports = app;
