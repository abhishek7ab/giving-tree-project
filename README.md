# 🌿 Giving Tree

**Giving Tree** is a free neighborhood sharing platform built for Pune. It helps neighbors share things they don't use anymore, borrow items they need for a few days, cut down on waste, and get to know the people living around them.

---

## 💡 Why We Built This

Think about how many things are sitting in our homes that we rarely use:
- That extra study table or chair after moving flats.
- A drill machine or ladder you only need for 20 minutes to hang a frame.
- Textbooks and novels you’ve already finished reading.
- Baby toys or gear that your kids have outgrown.

Instead of throwing them away or letting them collect dust, **Giving Tree** lets you give them away to a neighbor who actually needs them. No buying, no selling, no bidding wars—just neighbors helping neighbors.

---

## 🚀 How It Works

### 1. 🎁 Giving Away an Item
Got something you don't need?
1. Click **Give Item**.
2. Type a title, short description, and choose the item's condition (Brand new, Good, or Fair).
3. Pick your Pune locality (like *Kothrud*, *Baner*, or *Viman Nagar*).
4. *(Optional)* Click the map button to drop a pin on your neighborhood street or landmark.
5. Add a photo and hit **Publish Listing**. That's it!

### 2. 🔍 Finding & Requesting Things
Looking for something?
1. Open the **Browse Items** page.
2. Search by name or filter by your neighborhood and category.
3. When you see something you need, tap **Request Item** and write a polite message to the owner.

### 3. 💬 Chat & Pickup
1. The owner gets an instant notification and can accept your request.
2. Once accepted, an in-app chat opens so you can both agree on a safe, convenient pickup time and spot.
3. Pick up the item in person!

### 4. ⭐ Saying Thanks & Leaving a Review
1. After the item is handed over, the donor marks it as completed.
2. Both of you can leave a star rating and a quick thank-you note to build trust in the community.

---

## 📍 Focused on 8 Pune Neighborhoods

To make sure pickups are actually nearby and easy, Giving Tree is focused on 8 major areas in Pune:

1. **Kothrud** (Near MIT / Vanaz)
2. **Baner** (High Street / Balewadi)
3. **FC Road** (Shivaji Nagar / Deccan)
4. **Hinjawadi** (Phase 1 IT Park)
5. **Viman Nagar** (Near Phoenix Mall / Symbiosis)
6. **Koregaon Park** (North Main Road)
7. **Hadapsar** (Magarpatta / Amanora)
8. **Katraj** (Near Katraj Zoo / Bharati Vidyapeeth)

---

## 🛠️ How It's Built

We kept the tech stack clean, fast, and lightweight:

- **Backend:** Node.js & Express
- **Database:** PostgreSQL (with built-in fast search)
- **Live Updates & Chat:** Socket.IO for real-time notifications
- **Interactive Map:** Leaflet.js with Dark Mode map tiles
- **Frontend & Styling:** Clean, modern Vanilla JavaScript and a custom Dark Mode CSS theme (no heavy CSS frameworks)
- **Security:** Passwords hashed with bcrypt, JWT login cookies, and input validation

---

## 💻 Running It on Your Computer

Want to run the project locally or contribute? Here is how to get it going in 3 easy steps:

### 1. Clone & Install
Open your terminal and run:

```bash
git clone https://github.com/abhishek7ab/giving-tree-project.git
cd giving-tree-project
npm install
```

### 2. Set Up Environment Settings
Make a copy of the example settings file:

```bash
cp .env.example .env
```

Open `.env` in your code editor and add your database link and a secret key:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/giving_tree_db
JWT_SECRET=pick_any_random_secret_string_here
FRONTEND_URL=http://localhost:3000
```

### 3. Set Up Tables & Start Server
Set up the database tables:

```bash
node database/init.js
```

Start the app:

```bash
npm start
```

Now open your browser and visit:  
👉 **`http://localhost:3000`**

---

## 🧪 Testing

We wrote automated tests to make sure logins, item creation, map coordinates, and safety checks work properly without breaking:

```bash
npm test
```

All 31 unit and integration tests should pass with green checkmarks.

---

## 🤝 Want to Help or Contribute?

Found a bug or have an idea to make Giving Tree better?
1. Fork this repo.
2. Create a new branch (`git checkout -b my-new-feature`).
3. Make your changes and test them.
4. Commit and push (`git push origin my-new-feature`).
5. Open a Pull Request on GitHub.

---

## 📜 License

This project is open source and available under the **MIT License**.

Feel free to use it, share it, or adapt it for your own neighborhood!
