# 🌿 Giving Tree

> **A simple, friendly way to share and borrow items in your neighborhood.**  
> Giving Tree connects neighbors across Pune to give away things they no longer need, borrow items freely, reduce waste, and help each other out.

---

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passing-10b981?style=flat&logo=jest&logoColor=white)]()
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-f59e0b?style=flat&logo=pwa&logoColor=white)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📖 Table of Contents

- [About Giving Tree](#-about-giving-tree)
- [How It Works (Step-by-Step)](#-how-it-works-step-by-step)
- [The 8 Pune Neighborhood Hubs](#-the-8-pune-neighborhood-hubs)
- [Key Features](#-key-features)
- [Screenshots & Pages](#-screenshots--pages)
- [Technology Stack](#-technology-stack)
- [Project Folder Structure](#-project-folder-structure)
- [How to Set Up & Run Locally](#-how-to-set-up--run-locally)
- [Running Automated Tests](#-running-automated-tests)
- [Security & Quality Standards](#-security--quality-standards)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌳 About Giving Tree

Most of us have items at home that we rarely use—books, electronics, furniture, tools, baby gear, or kitchen appliances. At the same time, someone living just down the street might be looking for that exact item.

**Giving Tree** makes neighbor-to-neighbor sharing simple, safe, and transparent:
- **100% Free Sharing:** No money, no hidden fees, and no auctions.
- **Hyperlocal:** Organized around 8 major neighborhood hubs in Pune so pickups are fast, nearby, and convenient.
- **Community Trust:** Built-in review and rating system so neighbors can give and receive with confidence.
- **Interactive Map:** Easily drop a map pin for exact pickup spots without sharing private home addresses publicly.

---

## 🔄 How It Works (Step-by-Step)

```
 [ 1. Give an Item ] ───▶ [ 2. Browse & Search ] ───▶ [ 3. Request Item ] ───▶ [ 4. Handover & Chat ] ───▶ [ 5. Review & Rating ]
  Upload photo, title,      Filter by Pune hub,        Borrower sends a          Coordinate pickup spot      Rate neighbor & leave
  condition & location       category or keyword        request with note         via live messages           a friendly thank-you
```

### 1. 🎁 Giving an Item (Donor)
1. Log in and go to the **Give Item** page.
2. Enter a title, short description, category, and condition (New, Like new, Good, Fair, or For repair).
3. Pick your Pune neighborhood from the 8 community hubs.
4. *(Optional)* Click **Pinpoint Exact Pickup Spot on Map** to drop a precise pickup pin on the interactive map.
5. Upload a photo of the item and click **Publish Listing**.

### 2. 🔍 Finding Items (Borrower)
1. Go to the **Browse Items** catalog.
2. Search by keyword or filter by **Category**, **Condition**, or **Neighborhood Hub**.
3. View item details, donor profile, donor rating score, and pickup availability.

### 3. 💬 Requesting & Handover
1. Click **Request Item** on any available listing.
2. Select your pickup neighborhood, enter your delivery preferences, and send your request.
3. The owner gets an instant notification and can **Accept** or **Decline**.
4. Once accepted, a real-time message chat opens between donor and borrower to schedule a convenient pickup time.

### 4. ⭐ Completing & Rating
1. After the handover is complete, the donor marks the item as **Completed**.
2. Both donor and borrower can leave a star rating (`1 to 5 stars`) and review comment to build their community reputation.

---

## 📍 The 8 Pune Neighborhood Hubs

To ensure all item handovers remain local, safe, and close to home, Giving Tree focuses strictly on **8 curated community hubs in Pune, Maharashtra**:

| Hub | Landmark / Popular Area | Coordinates |
|---|---|---|
| **Kothrud** | Near MIT Campus / Vanaz Metro Station | `18.5074° N, 73.8077° E` |
| **Baner** | Baner High Street / Balewadi | `18.5590° N, 73.7868° E` |
| **FC Road** | Shivaji Nagar / Deccan Gymkhana | `18.5284° N, 73.8417° E` |
| **Hinjawadi** | Phase 1 IT Park / Shivaji Chowk | `18.5913° N, 73.7389° E` |
| **Viman Nagar** | Near Phoenix Mall / Symbiosis | `18.5679° N, 73.9143° E` |
| **Koregaon Park** | North Main Road / Osho Ashram | `18.5362° N, 73.8940° E` |
| **Hadapsar** | Magarpatta City / Amanora Town Centre | `18.5089° N, 73.9259° E` |
| **Katraj** | Katraj Zoo / Bharati Vidyapeeth | `18.4575° N, 73.8677° E` |

---

## ✨ Key Features

- **🗺️ Interactive On-Demand Map:** Uses Leaflet and CartoDB Dark Matter tiles. The map is collapsed by default to save screen space, opening smoothly when clicked or when using GPS auto-detection.
- **⚡ Live Push Notifications:** Powered by Socket.IO. Receive real-time alerts when someone requests your item, accepts your request, or sends a chat message.
- **🎨 Modern Dark Theme Design System:** Built using a custom vanilla CSS design system with rich dark slate surfaces (`#090d16`, `#0f172a`), clean typography, and vibrant emerald green accents (`#10b981`).
- **📱 Progressive Web App (PWA):** Features a service worker (`sw.js`) that caches all key pages, stylesheets, and scripts for fast loading and offline support.
- **🛡️ Community Moderation:** Includes an Admin dashboard for managing listings, removing inappropriate content, and protecting community safety.

---

## 📄 Pages Included

| Page | URL | Purpose |
|---|---|---|
| **Home / Landing** | `/index.html` | Hero introduction, Pune community map, and recent listings |
| **Browse Catalog** | `/items.html` | Live search, category filters, locality chips, and item cards |
| **Give Item** | `/post-item.html` | Item creation form with live card preview and on-demand map |
| **Activity Hub** | `/requests.html` | Track incoming and outgoing requests with live chat |
| **My Items** | `/my-items.html` | Manage your active listings, edit details, or remove items |
| **User Profile** | `/profile.html` | Public trust score, member history, and neighbor reviews |
| **Admin Hub** | `/admin.html` | Moderation tools, live stats, and user management |
| **Sign In / Sign Up** | `/login.html`, `/register.html` | Simple, secure authentication with Pune hub selection |

---

## 🛠️ Technology Stack

| Layer | Tools & Libraries |
|---|---|
| **Backend Runtime** | Node.js (v18+) |
| **Web Framework** | Express.js |
| **Database** | PostgreSQL with Full-Text Search (`tsvector`) |
| **Real-Time WebSockets** | Socket.IO |
| **Image Hosting** | Cloudinary SDK / Local Multer storage fallback |
| **Frontend UI** | HTML5, Vanilla JavaScript (ES6+), CSS3 Design System |
| **Mapping & GIS** | Leaflet.js, CartoDB Dark Matter, OpenStreetMap |
| **Validation** | Zod schema validation |
| **Testing** | Jest, Supertest |

---

## 📁 Project Folder Structure

```
giving-tree-project/
├── config/
│   └── cloudinary.js         # Image upload cloud configuration
├── controllers/
│   ├── authController.js     # Login, register, profile editing
│   ├── itemController.js     # Item listing, search, updating, deletion
│   └── requestController.js  # Handover requests, status changes, chat, reviews
├── database/
│   ├── db.js                 # PostgreSQL connection pool
│   └── init.js               # Database schema tables & automatic migrations
├── frontend/
│   ├── assets/
│   │   ├── js/               # Helper utilities, map picker, notifications, auth
│   │   ├── style/            # Unified CSS files (variables, base, navbar, cards, pages)
│   │   └── vendor/           # Leaflet mapping assets
│   ├── index.html            # Landing page
│   ├── items.html            # Catalog browsing
│   ├── post-item.html        # Post new listing
│   ├── requests.html         # Activity & chat center
│   ├── my-items.html         # User's items
│   ├── profile.html          # Public profile & reviews
│   ├── admin.html            # Admin moderation panel
│   ├── login.html            # Login screen
│   ├── register.html         # Registration screen
│   ├── sw.js                 # Service worker for offline caching
│   └── manifest.json         # PWA configuration
├── middleware/
│   ├── authMiddleware.js     # JWT token verification & admin guards
│   └── validation.js         # Input validation schemas & coordinate bounds
├── models/
│   ├── userModel.js          # User database operations
│   ├── itemModel.js          # Item database operations & search queries
│   ├── requestModel.js       # Request coordination & notifications
│   └── reviewModel.js        # Ratings and reviews operations
├── routes/
│   ├── authRoutes.js         # /login, /register, /profile endpoints
│   ├── itemRoutes.js         # /items, /post-item, /api/items endpoints
│   └── requestRoutes.js      # /requests, /api/activity, /api/reviews endpoints
├── tests/                    # Automated Jest unit & integration tests
├── server.js                 # Express server entry point & Socket.IO server
├── package.json              # Project dependencies & scripts
└── README.md                 # Documentation
```

---

## 🚀 How to Set Up & Run Locally

Follow these simple steps to run Giving Tree on your local computer:

### 1. Prerequisites
Make sure you have:
- **Node.js** (version 18 or higher) installed ([Download Node.js](https://nodejs.org/))
- **PostgreSQL** database (Local PostgreSQL or a free cloud database like Neon, Supabase, or Render)

---

### 2. Clone the Repository
Open your terminal or command prompt and run:

```bash
git clone https://github.com/abhishek7ab/giving-tree-project.git
cd giving-tree-project
```

---

### 3. Install Dependencies
Install all required Node.js packages:

```bash
npm install
```

---

### 4. Configure Your Environment (`.env`)
Create a `.env` file in the root folder (you can copy `.env.example`):

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in your values:

```env
# Database connection string (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/giving_tree_db?sslmode=require

# Secret key for JWT authentication tokens
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Cloudinary image upload credentials (Optional for local testing)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

### 5. Initialize the Database
Run the automated initialization script to create all tables, indexes, and initial data:

```bash
node database/init.js
```

---

### 6. Start the Server
Run the application server:

```bash
# Start server
npm start

# Or start with auto-reload during development
npm run dev
```

Open your web browser and go to:
👉 **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

Giving Tree includes comprehensive automated tests to ensure everything works reliably:

```bash
# Run all Jest tests
npm test

# Run tests with detailed descriptions
npm test -- --verbose
```

### Test Suite Summary:
```text
PASS tests/auth_uniqueness_location.test.js
  ✓ Verifies all 8 Pune hubs are strictly configured
  ✓ Verifies valid coordinates for every hub
  ✓ Enforces username uniqueness

PASS tests/validation.test.js
  ✓ Validates registration, login, and profile inputs
  ✓ Validates item posting, condition enums, and coordinate boundaries
  ✓ Validates request payloads and review 1-5 star ratings

PASS tests/location_flow.test.js
  ✓ Validates Haversine distance computations
  ✓ Validates GPS coordinate bounds (-90 to +90 lat, -180 to +180 lng)

Test Suites: 3 passed, 3 total
Tests:       31 passed, 31 total
```

---

## 🔒 Security & Quality Standards

- **Password Hashing:** Uses `bcrypt` with high salt rounds to securely hash user passwords.
- **SQL Injection Defense:** 100% of database queries use parameterized SQL placeholders (`$1`, `$2`).
- **XSS Protection:** Automatic HTML entity encoding on user-generated content prevents malicious script injection.
- **Content Security Policy (CSP):** Configured via Helmet to safely load map tiles from verified map providers (`CartoDB`, `OpenStreetMap`, `OpenFreeMap`).
- **Rate Limiting:** Protects authentication and listing endpoints against brute-force attacks.
- **Ownership Verification:** Ensures only listing owners can modify or delete their own items.

---

## 🤝 Contributing

We welcome community contributions to make Giving Tree even better!

1. Fork the Project (`Fork` button on GitHub)
2. Create your Feature Branch (`git checkout -b feature/NewFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some NewFeature'`)
4. Push to the Branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ for neighborhood communities in Pune.</sub>
</div>
