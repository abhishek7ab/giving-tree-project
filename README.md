# 🌿 Giving Tree — Community Sharing Hub

> **Small Acts. Big Connections.**  
> A hyper-local community circular-sharing platform where neighbors in Pune give away unused items for free, build trust, reduce landfill waste, and connect with their local community.

[![Tests](https://img.shields.io/badge/Tests-44%20Passed-10b981?style=for-the-badge&logo=jest)](tests/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📖 Table of Contents

- [💡 Why Giving Tree?](#-why-giving-tree)
- [✨ Core Features](#-core-features)
- [📍 Pune Neighborhood Hubs](#-pune-neighborhood-hubs)
- [🏗️ Tech Stack & Architecture](#️-tech-stack--architecture)
- [🚀 Quick Start (Local Setup)](#-quick-start-local-setup)
- [🧪 Running Automated Tests](#-running-automated-tests)
- [🌐 Live API Endpoints](#-live-api-endpoints)
- [☁️ Deployment (Vercel / Render / Cloud)](#️-deployment-vercel--render--cloud)
- [🛡️ Security Architecture](#️-security-architecture)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 💡 Why Giving Tree?

Think about how many usable items sit idle in our homes:
- An extra study table or office chair after moving flats.
- A drill machine or toolkit used only once a year.
- College textbooks, fiction novels, and reference guides.
- Electronic gadgets, monitors, monitors, and kitchenware.

Instead of letting them gather dust or throwing them in landfills, **Giving Tree** enables neighbors to pass them on for free. No bidding, no fees, no ads—just pure community trust.

---

## ✨ Core Features

### 🎁 1. Free Item Sharing & Posting
- **Multi-Step Posting**: Post an item in under 60 seconds with title, category, description, and condition (`New`, `Good`, `Fair`).
- **Cloudinary Image Uploads**: Fast image hosting with automatic responsive transformations and fallback previews.
- **Interactive Map Pinning**: Drop a GPS pin on your neighborhood street or landmark using OpenStreetMap / Leaflet.

### 🔍 2. Intelligent Catalog & Search
- **Faceted Filtering**: Filter by category (*Electronics*, *Furniture*, *Books*, *Clothing*, *Home*, *Other*), condition, and locality.
- **Live Search**: Instant client-side & server-side search across titles and descriptions.
- **Visual Card Badges**: Clear non-overlapping category and condition tags.

### 💬 3. Activity Hub & Live Coordination Chat
- **Instant Item Requests**: Send requests with custom polite notes to donors.
- **Real-Time WebSockets**: Socket.IO-powered real-time notifications for incoming requests and status changes.
- **Direct Handover Chat**: Coordinate safe local meeting spots and timings in-app.

### 🛡️ 4. Master Admin Dashboard
- **Comprehensive Management**: Search and manage community members and inventory items.
- **CSV Data Export**: Export members and inventory records with one click.
- **Audit Logging**: Track administrative actions and system security events.

### 📱 5. Progressive Web App (PWA) & Responsive UI
- **Editorial Dark Theme**: Restrained `#10b981` emerald accent on sleek dark surfaces with smooth scroll-reveal animations.
- **Mobile-First Glass Navbar**: Full-width frosted glass dropdown menu and tactile buttons.
- **Installable PWA**: Offline-capable service worker with standard W3C Web App Manifest.

---

## 📍 Pune Neighborhood Hubs

Giving Tree is mapped to 8 major community clusters across Pune:

| Locality | Key Landmarks | Latitude | Longitude |
|---|---|---|---|
| **Kothrud** | MIT World Peace Univ / Vanaz Metro | `18.5074` | `73.8077` |
| **Baner** | Baner High Street / Pan Card Club | `18.5590` | `73.7868` |
| **FC Road** | Shivaji Nagar / Fergusson College | `18.5204` | `73.8406` |
| **Hinjawadi** | Phase 1 & 2 IT Park Hub | `18.5913` | `73.7389` |
| **Viman Nagar** | Phoenix Marketcity / Symbiosis | `18.5679` | `73.9143` |
| **Koregaon Park**| North Main Road / Osho Garden | `18.5362` | `73.8940` |
| **Hadapsar** | Magarpatta City / Amanora Town | `18.5089` | `73.9259` |
| **Katraj** | Bharati Vidyapeeth / Katraj Lake | `18.4575` | `73.8677` |

---

## 🏗️ Tech Stack & Architecture

```
giving-tree-project/
├── config/              # Cloudinary & JWT configuration
├── controllers/         # Request handlers (auth, items, requests)
├── database/            # PostgreSQL connection pool & schema migrations
├── middleware/          # JWT auth, role validation, input sanitization, rate limiting
├── models/              # Data access models (user, item, request, audit)
├── routes/              # Express route definitions
├── frontend/            # Frontend static assets (HTML, CSS, JS, PWA manifest)
│   ├── assets/style/    # Modular CSS design system (variables, base, navbar, cards, pages)
│   ├── assets/js/       # Client-side scripts (animations, location-picker, navbar-auth)
│   └── *.html           # Semantic HTML5 pages
├── tests/               # Automated Jest test suites
├── server.js            # Express application entrypoint & Socket.IO server
└── package.json         # Dependencies & scripts
```

- **Backend**: Node.js, Express 4, Socket.IO
- **Database**: PostgreSQL with `pg` connection pooling (compatible with Neon, Supabase, Railway)
- **Frontend**: Native HTML5, Vanilla JavaScript (ES2022), Custom CSS Design System
- **Mapping**: Leaflet.js, OpenStreetMap CartoDB Tiles
- **Media**: Cloudinary API + Local fallback storage
- **Security**: Helmet, Rate Limiter, bcryptjs, HTTP-only JWT Cookies, Input Sanitization

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js** (v18.0 or higher)
- **PostgreSQL** database (local or hosted on [Neon](https://neon.tech))

### 2. Clone & Install
```bash
git clone https://github.com/abhishek7ab/giving-tree-project.git
cd giving-tree-project
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/giving_tree_db
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
FRONTEND_URL=http://localhost:3000

# Optional: Cloudinary (for cloud image hosting)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: SMTP Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=586
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 4. Initialize Database Schema
```bash
node database/init.js
```

### 5. Start Development Server
```bash
npm start
```

Visit **`http://localhost:3000`** in your browser! 🎉

---

## 🧪 Running Automated Tests

Giving Tree includes comprehensive unit, integration, and security tests powered by **Jest** and **Supertest**:

```bash
npm test
```

### Test Suite Breakdown:
- **`tests/models_and_utils.test.js`**: Data models, coordinate calculation, and input validation.
- **`tests/security_and_auth.test.js`**: Password hashing, JWT token rotation, authentication guards, and rate limiting.
- **`tests/api_routes.test.js`**: Public & protected HTTP endpoints, item creation, and status transitions.
- **`tests/comprehensive_e2e.test.js`**: End-to-end user workflows and static asset integrity.

**Result: 44 / 44 tests passed (100% success rate)**.

---

## 🌐 Live API Endpoints

### 🔐 Authentication
- `POST /register` — Register a new member account
- `POST /login` — Authenticate and receive HTTP-only JWT cookie
- `GET /logout` — Clear session cookie and log out
- `GET /api/user` — Get current authenticated user profile
- `POST /api/user/update-name` — Update display name and neighborhood
- `POST /api/user/change-password` — Change password securely

### 📦 Items & Inventory
- `GET /api/items` — Fetch paginated items with filters (query, category, locality)
- `GET /api/items/recent` — Fetch recent items for homepage preview
- `POST /post-item` — Create a new item listing (with multipart image upload)
- `PUT /api/items/:id` — Update an existing item
- `POST /delete-item` — Delete an item listing

### 🤝 Requests & Activity
- `POST /api/requests` — Submit a request for an item
- `GET /api/requests/incoming` — Fetch requests received for donor's items
- `GET /api/requests/outgoing` — Fetch requests sent by user
- `POST /api/requests/:id/accept` — Accept a request and open coordination chat
- `POST /api/requests/:id/reject` — Reject a request

### 🛡️ Administration (Admin Role Required)
- `GET /api/admin/data` — Master dashboard inventory, members, and metrics
- `POST /admin/delete-user` — Remove a user account
- `POST /admin/delete-item` — Permanently remove an item listing
- `GET /api/admin/audit-logs` — Fetch recent security audit events

---

## ☁️ Deployment (Vercel / Render / Cloud)

### Deploying to Vercel:
1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New Project**.
3. Select your `giving-tree-project` repository.
4. Add the Environment Variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - *(Optional)* Cloudinary & Email credentials
5. Click **Deploy**.

---

## 🛡️ Security Architecture

- **Password Security**: Passwords hashed with `bcryptjs` (salt rounds: 10).
- **Authentication**: Stateless signed JWT cookies with `HttpOnly`, `SameSite: Lax`, and `Secure` flags.
- **HTTP Headers**: Enforced via `helmet` (CSP, X-Content-Type-Options, X-Frame-Options).
- **Rate Limiting**: Configured with `express-rate-limit` to prevent brute-force attacks.
- **SQL Injection Prevention**: Parameterized queries across all PostgreSQL database interactions.
- **Input Sanitization**: HTML escaping to eliminate Cross-Site Scripting (XSS).

---

## 🤝 Contributing

Contributions are welcome!
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m "feat: add amazing feature"`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Built with 💚 for the Pune community.
