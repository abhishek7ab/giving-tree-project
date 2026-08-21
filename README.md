# 🌿 Giving Tree — Community Sharing Platform

> **Share More. Waste Less. Connect Locally.**  
> A simple, trusted community platform where neighbors in Pune give away unused items for 100% free, reduce landfill waste, and help people nearby.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-giving--tree--project.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://giving-tree-project.vercel.app/)
[![Tests](https://img.shields.io/badge/Tests-68%20Passed-10b981?style=for-the-badge&logo=jest)](tests/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> 🚀 **Live Website**: Try it live right now at **[https://giving-tree-project.vercel.app/](https://giving-tree-project.vercel.app/)**

---

## 📖 Table of Contents

- [💡 What is Giving Tree?](#-what-is-giving-tree)
- [✨ Key Features](#-key-features)
- [📍 10 Pune Neighborhood Hubs](#-10-pune-neighborhood-hubs)
- [🛡️ Trust, Safety & Anti-Fake Policy](#️-trust-safety--anti-fake-policy)
- [📱 Mobile-First Experience](#-mobile-first-experience)
- [🏗️ Technology Stack](#️-technology-stack)
- [🚀 Quick Local Setup](#-quick-local-setup)
- [🧪 Running Automated Tests](#-running-automated-tests)
- [🌐 Main API Endpoints](#-main-api-endpoints)
- [☁️ Deployment (Vercel & Cloud)](#️-deployment-vercel--cloud)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 💡 What is Giving Tree?

Most of us have useful things at home that we no longer use:
- Textbooks and novels after finishing exams.
- A study chair or table after shifting apartments.
- Kitchen appliances, baby toys, or extra electronic cables.

Instead of throwing them in the trash or letting them gather dust, **Giving Tree** helps you give them directly to a neighbor who needs them—completely free. 

- **100% Free**: No money, no hidden charges, no bidding wars.
- **Hyper-Local**: Pick up items in your own Pune neighborhood.
- **Zero Fake Data**: Real people and genuine items only.

---

## ✨ Key Features

### 🎁 1. Easy Item Donating (Under 60 Seconds)
- Fill in item title, condition (`New`, `Like new`, `Good`, `Fair`, `For repair`), and category.
- **100% Real Photo Upload**: Donors upload authentic photos taken on their phone or camera.
- **Precise Pickup Pin**: Pinpoint a safe public meetup spot on the interactive map.

### 🔍 2. Smart Catalog & Filters
- **10-Hub Dropdown**: Switch between 10 Pune localities (*Kothrud*, *Baner*, *FC Road*, *Hinjawadi*, *Viman Nagar*, etc.) with real-time item counts.
- **Distance Filter**: Filter items by distance (`< 2 km`, `< 5 km`, `< 15 km`, or `Near Me`).
- **Instant Search**: Search by name or category with fast response times.

### 💬 3. Live Chat & Meetup Coordination
- Request items with a friendly note to the donor.
- Use **In-App Chat** with instant quick-reply buttons (e.g. *"Free today 6 PM"*, *"Let's meet at main gate"*, *"On my way!"*).
- Real-time updates with **Socket.IO** notifications.

### 🔐 4. 4-Digit Handover PIN Verification
- When you meet to collect an item, the recipient shares a unique **4-digit safety PIN** shown on their screen.
- The donor enters the PIN to confirm the successful handover.

### 💌 5. Gratitude Wall & Neighbor Reviews
- After receiving an item, leave a warm thank-you message for the donor.
- Review notes appear on the neighbor's public profile and celebrate local kindness.

### 🛡️ 6. Master Admin Dashboard
- Live dashboard for platform health and moderation.
- View real-time activity events and manage user or item listings.
- One-click CSV export for offline reports.

---

## 📍 10 Pune Neighborhood Hubs

Giving Tree connects 10 verified public neighborhood clusters across Pune:

| Locality | Key Landmark / Pickup Spot | Area Type |
|---|---|---|
| **Kothrud** | Near MIT / Vanaz Metro Station | Residential & Student Area |
| **Baner** | Baner High Street / Balewadi | IT & Residential Hub |
| **FC Road** | Fergusson College / Shivaji Nagar | Central Student District |
| **Hinjawadi** | Phase 1 IT Park / Shivaji Chowk | Major Tech Park Hub |
| **Viman Nagar** | Near Phoenix Marketcity / Symbiosis | Airport & College Hub |
| **Koregaon Park** | North Main Road / Osho Garden | Central Neighborhood |
| **Hadapsar** | Magarpatta City / Amanora Town | Residential & Tech Hub |
| **Katraj** | Katraj Lake / Bharati Vidyapeeth | Southern Pune Hub |
| **Wakad** | Dutta Mandir / Bhumkar Chowk | Western Residential Hub |
| **Aundh** | Westend Mall / Bremen Chowk | North-West Pune |

---

## 🛡️ Trust, Safety & Anti-Fake Policy

1. **Human Security CAPTCHA**: Built-in visual security challenge during login/registration to stop spam bots.
2. **Valid Email Verification**: Enforces genuine, well-formed email addresses with live password strength meters.
3. **Authentic Photos Only**: Stock photos, AI-generated images, and fake placeholders are prohibited.
4. **Public Meetup Standard**: Encourages pickups at well-lit, public landmarks.
5. **Fair-Share Quota**: 5 active requests maximum per user to prevent hoarding.

---

## 📱 Mobile-First Experience

Giving Tree is fully optimized for smartphones and tablets:
- **Bottom Navigation Dock**: 1-tap dock to quickly switch between *Home*, *Browse*, *+ Donate*, *Activity*, and *Profile*.
- **Touch-Friendly Modals**: Item details and live chats slide up smoothly as bottom sheets.
- **Zero Viewport Clutter**: No horizontal scrolling issues or oversized popovers.
- **iOS Zoom Protection**: Clean inputs sized at 16px to prevent unwanted Safari zooming.

---

## 🏗️ Technology Stack

```
giving-tree-project/
├── config/              # Cloudinary & JWT configuration
├── controllers/         # Request handlers (auth, items, requests, reviews)
├── database/            # PostgreSQL connection pool & schema
├── middleware/          # Security, auth tokens, rate limits, input cleaning
├── models/              # Database models (User, Item, Request, Review, Audit)
├── routes/              # Express API endpoints
├── frontend/            # Frontend web application
│   ├── assets/style/    # Modular CSS design system (dark mode, mobile-first)
│   ├── assets/js/       # Client logic (auth, chat, maps, notifications)
│   └── *.html           # Web pages
├── tests/               # Automated test suites
├── utils/               # CAPTCHA, emailer, admin notifier utilities
├── server.js            # Main Express & Socket.IO server
└── package.json         # Project dependencies
```

- **Backend**: Node.js & Express
- **Real-Time Communication**: Socket.IO
- **Database**: PostgreSQL (Neon Serverless PostgreSQL)
- **Frontend**: HTML5, Vanilla JavaScript, Custom CSS Design System
- **Maps**: Leaflet.js & OpenStreetMap
- **Security**: bcryptjs, JWT Cookies (`HttpOnly`), Helmet, Express Rate Limit

---

## 🚀 Quick Local Setup

### 1. Requirements
- **Node.js** (v18 or higher)
- **PostgreSQL** database (local or free cloud database on [Neon](https://neon.tech))

### 2. Clone the Project
```bash
git clone https://github.com/abhishek7ab/giving-tree-project.git
cd giving-tree-project
npm install
```

### 3. Set Up Environment Variables
Create a `.env` file in the project folder:
```env
PORT=3000
DATABASE_URL=postgresql://your_user:your_password@your_host/giving_tree_db
JWT_SECRET=your_secret_jwt_key_at_least_32_characters_long
FRONTEND_URL=http://localhost:3000

# Optional: Cloudinary for cloud photos (falls back to local uploads if omitted)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: Email notifications (falls back to test mailer if omitted)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### 4. Create Database Tables
```bash
node database/init.js
```

### 5. Start the Server
```bash
npm start
```

Open your browser and visit: **`http://localhost:3000`** 🎉

---

## 🧪 Running Automated Tests

Giving Tree comes with full automated test coverage using **Jest** and **Supertest**:

```bash
npm test
```

### Test Suites Included:
- `tests/models_and_utils.test.js` — Database models, calculations, coordinate math.
- `tests/security_and_auth.test.js` — Password hashing, JWT token safety, rate limiting, and CAPTCHA.
- `tests/api_routes.test.js` — Items, categories, and request workflow APIs.
- `tests/wishlist.test.js` — Community wishlist, items wanted queries, smart matching, and fulfillment.
- `tests/comprehensive_e2e.test.js` — Complete registration, post, request, and handover flow.
- `tests/live_flow_e2e.test.js` — Real-time chat, PIN verification, and neighbor reviews.

**Status: 68 / 68 tests passing (100% success rate across all 6 suites)**.

---

## 🌐 Main API Endpoints

### 🔐 Authentication & Profile
- `POST /register` — Register a new member
- `POST /login` — Sign in and get session cookie
- `GET /logout` — Sign out safely
- `GET /api/captcha` — Generate new security CAPTCHA
- `GET /api/user` — Get logged-in profile data
- `POST /api/user/update-name` — Update display name and neighborhood hub
- `POST /api/user/change-password` — Change password

### 📦 Items & Donations
- `GET /api/items` — List items with search, category, and locality filters
- `GET /api/items/recent` — Get latest shared items
- `POST /post-item` — Publish a new donation listing
- `PUT /api/items/:id` — Edit an existing item
- `POST /delete-item` — Remove an item listing

### ✨ Community Wishlist ("Items Wanted" Board)
- `GET /api/wishes` — List active wishes with category & Pune locality filters
- `POST /api/wishes` — Post a new community wish with urgency badge
- `GET /api/wishes/my` — Get logged-in user's active/fulfilled wishes
- `POST /api/wishes/:id/fulfill` — Mark a wish as fulfilled by the community
- `DELETE /api/wishes/:id` — Delete a posted wish
- `GET /api/wishes/match` — Query matching open wishes for donor item categories & hubs

### 🤝 Requests & Handover
- `POST /request-item` — Send a request for an item
- `GET /api/activity/data` — Fetch all incoming & outgoing requests
- `POST /update-status` — Accept, reject, or cancel a request
- `POST /api/requests/:id/verify-pin` — Confirm handover with 4-digit PIN
- `POST /api/requests/:id/messages` — Send live coordination chat message
- `POST /api/reviews` — Post a thank-you note to a neighbor

### 🛡️ Admin
- `GET /api/admin/data` — Master inventory, member stats, and health metrics
- `POST /admin/delete-user` — Remove a spam/fake user
- `POST /admin/delete-item` — Remove an inappropriate item

---

## ☁️ Deployment (Vercel & Cloud)

### Live Website:
👉 **[https://giving-tree-project.vercel.app/](https://giving-tree-project.vercel.app/)**

### Deploy to Vercel in 3 Steps:
1. Push your code to GitHub:
   ```bash
   git push origin main
   ```
2. Open [Vercel Dashboard](https://vercel.com/dashboard) and import your `giving-tree-project` repository.
3. Add `DATABASE_URL` and `JWT_SECRET` in **Environment Variables**, then click **Deploy**.

---

## 🤝 Contributing

We welcome community contributions!
1. Fork the repo.
2. Create your branch: `git checkout -b feature/new-idea`.
3. Commit your work: `git commit -m "Add new idea"`.
4. Push to branch: `git push origin feature/new-idea`.
5. Open a Pull Request.

---

## 📜 License

This project is open-source and licensed under the **MIT License**.

Built with 💚 to make local giving easy and accessible for everyone in Pune.

