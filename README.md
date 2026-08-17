# 🌿 Giving Tree

> **A Hyperlocal Neighborhood Item Sharing & Generosity Platform**  
> Connect with neighbors across Pune to share, borrow, and give items freely—reducing waste and building tighter community bonds.

---

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![Styling](https://img.shields.io/badge/styling-Custom%20CSS%20Design%20System-emerald.svg)]()
[![Tests](https://img.shields.io/badge/tests-Jest%20(31%2F31%20passing)-success.svg)]()
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-orange.svg)]()
[![License](https://img.shields.io/badge/license-MIT-informational.svg)]()

---

## ✨ Key Features

- **📍 8 Curated Pune Neighborhood Hubs:** Strictly geo-fenced community hubs across **Kothrud**, **Baner**, **FC Road**, **Hinjawadi**, **Viman Nagar**, **Koregaon Park**, **Hadapsar**, and **Katraj**.
- **🗺️ Interactive On-Demand Map Picker:** Built with Leaflet & CartoDB Dark Matter tiles. Collapsible on-demand map for dropping exact pickup pins, calculating Haversine distance, and GPS auto-detection.
- **⚡ Real-Time Socket.IO Coordination:** Live push notifications and chat messages for request updates, acceptance, and handover scheduling.
- **🎨 Premium Dark Theme Design System:** Crafted with restrained dark slate surfaces (`#090d16`, `#0f172a`), crisp white typography, and vibrant emerald accents (`#10b981`).
- **⭐ Community Trust & Reviews:** Post-handover rating and review system to foster verified trust between neighbors.
- **📱 Progressive Web App (PWA):** Service worker precaching (`v18`) with offline fallback support and responsive cross-device layout.
- **🔒 Production-Grade Security:**
  - JWT authentication with secure HTTP-only cookies
  - Zod & Joi schema validation for all inputs and GPS coordinates
  - SQL injection prevention via parameterized PostgreSQL queries
  - XSS entity encoding and DOM sanitization
  - Helmet Content Security Policy (CSP) and API rate limiting

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express.js, Socket.IO, Multer, Cloudinary SDK, JWT, bcrypt |
| **Database** | PostgreSQL (pg / pg-pool) with full-text search (`tsvector`, `ts_rank_cd`) |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5 Semantic Architecture, Service Workers |
| **Styling** | Custom Modular CSS Design System (Variables, Tokens, Cards, Animations, Container Queries) |
| **Maps & Geo** | Leaflet.js, CartoDB Dark Matter, OpenStreetMap, OpenFreeMap |
| **Testing** | Jest, Supertest |

---

## 📁 Project Structure

```
giving-tree-project/
├── config/
│   └── cloudinary.js         # Cloudinary media upload integration
├── controllers/
│   ├── authController.js     # User registration, login, profile management
│   ├── itemController.js     # Catalog search, posting, status updates, saved items
│   └── requestController.js  # Item requests, status transitions, notifications, chat
├── database/
│   ├── db.js                 # PostgreSQL connection pool configuration
│   └── init.js               # Database schema initialization & table migrations
├── frontend/
│   ├── assets/
│   │   ├── js/               # Client scripts (utils, location-picker, notifications, auth)
│   │   ├── style/            # Modular CSS design system (base, navbar, cards, pages, etc.)
│   │   └── vendor/           # Local vendor assets (Leaflet)
│   ├── index.html            # Landing page & Pune community map
│   ├── items.html            # Browse catalog with live search & locality filters
│   ├── post-item.html        # Post new listing with on-demand GPS map picker
│   ├── requests.html         # Real-time activity hub & message center
│   ├── my-items.html         # User's active listings & management
│   ├── profile.html          # Public profile & trust reviews
│   ├── admin.html            # Community moderation dashboard
│   ├── login.html            # Authentication login
│   ├── register.html         # Neighborhood registration
│   ├── sw.js                 # PWA service worker with offline cache
│   └── manifest.json         # Web app manifest
├── middleware/
│   ├── authMiddleware.js     # JWT verification & role authorization
│   └── validation.js         # Zod schemas for input & coordinate bounds
├── models/
│   ├── userModel.js          # User queries & profile transactions
│   ├── itemModel.js          # Item queries, full-text search & soft deletes
│   ├── requestModel.js       # Request coordination, notifications & chat
│   └── reviewModel.js        # Star ratings & user reviews
├── routes/
│   ├── authRoutes.js         # Authentication routes
│   ├── itemRoutes.js         # Catalog & item management routes
│   └── requestRoutes.js      # Request & communication routes
├── tests/                    # Jest automated test suites
├── server.js                 # Express server & Socket.IO initialization
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **PostgreSQL** database (Local or Cloud instance e.g., Neon, Supabase, Render)

### 2. Clone the Repository
```bash
git clone https://github.com/abhishek7ab/giving-tree-project.git
cd giving-tree-project
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=your-secure-jwt-secret-key
FRONTEND_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 5. Initialize the Database
Run the automated database migration script to set up all tables and indexes:

```bash
node database/init.js
```

### 6. Start the Server
```bash
# Start production server
npm start

# Or run with nodemon for development
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 🧪 Running Tests

Giving Tree includes comprehensive automated test suites covering validation schemas, coordinate bounds, username uniqueness, and location flows:

```bash
# Run all Jest tests
npm test

# Run tests with verbose output
npm test -- --verbose
```

```
PASS tests/auth_uniqueness_location.test.js
PASS tests/validation.test.js
PASS tests/location_flow.test.js

Test Suites: 3 passed, 3 total
Tests:       31 passed, 31 total
Snapshots:   0 total
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.
