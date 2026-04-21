const { uploadToCloudinary } = require('../config/cloudinary');
const path = require('path');
const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel');
const db = require('../database/db');

// ================= 1. BROWSE CATALOG =================
exports.getItems = (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pages', 'items.html'));
};

exports.getItemsData = async (req, res) => {
    try {
        const searchTerm = req.query.search || '';
        const items = await itemModel.getAllItems(searchTerm, 'All');
        res.json({ items });
    } catch (err) {
        console.error("GET ITEMS ERROR:", err.message);
        res.json({ error: "DB Error" });
    }
};

// ================= 2. MY ITEMS =================
exports.showMyItems = (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pages', 'my-items.html'));
};

exports.getMyItemsData = async (req, res) => {
    try {
        const user_id = req.session?.user?.id;
        const items = await itemModel.getItemsByUser(user_id);
        res.json({ items });
    } catch (err) {
        console.error("MY ITEMS ERROR:", err.message);
        res.json({ error: "Database error" });
    }
};

// ================= 3. ADMIN PANEL =================
exports.showAdminPanel = (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pages', 'admin.html'));
};

exports.getAdminData = async (req, res) => {
    try {
        const items = await itemModel.getAllItems('', 'All');
        const users = await userModel.getAllUsers();

        res.json({
            items,
            users,
            stats: {
                totalItems: items.length,
                totalUsers: users.length
            }
        });
    } catch (err) {
        console.error("ADMIN ERROR:", err.message);
        res.json({ error: "Admin data error" });
    }
};

// ================= 4. SHOW POST ITEM PAGE =================
exports.showPostItem = (req, res) => {
    res.sendFile(path.join(process.cwd(), 'pages', 'post-item.html'));
};

// ================= 5. POST ITEM =================
exports.postItem = async (req, res) => {
    console.log("🔥 BODY:", req.body);
    console.log("🔥 FILE:", req.file);

    try {
        const { title, description, location } = req.body;

        if (!req.file) {
            return res.status(400).send("❌ File NOT received by server");
        }

        // 🔥 Upload to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer);
        const image = result.secure_url;

        console.log("✅ IMAGE URL:", image);

        const user_id = req.session?.user?.id;

        if (!user_id) {
            return res.status(401).send("Session missing");
        }

        await itemModel.createItem(title, description, location, image, user_id);

        res.redirect('/items');

    } catch (err) {
        console.error("❌ ERROR STACK:", err.stack);
        res.status(500).send(err.message);
    }
};

// ================= 6. DELETE ITEM =================
exports.deleteItem = async (req, res) => {
    try {
        const id = req.body.id;
        const user_id = req.session?.user?.id;

        if (!user_id) return res.status(401).send("Not logged in");

        await itemModel.deleteItem(id, user_id);
        res.redirect('/my-items');

    } catch (err) {
        console.error("DELETE ERROR:", err.message);
        res.status(500).send("Error deleting item");
    }
};

// ================= 7. RECENT ITEMS =================
exports.getRecentItems = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM items WHERE status = 'available' ORDER BY id DESC LIMIT 3"
        );
        res.json(result.rows);
    } catch (err) {
        console.error("RECENT ITEMS ERROR:", err.message);
        res.status(500).json({ error: "DB Error" });
    }
};
// ================= 8. REQUEST ITEM =================
exports.requestItem = async (req, res) => {
    try {
        const { item_id } = req.body;

        console.log("📩 Request received for item:", item_id);

        // ⚠️ TEMP: no session (since cross-domain issue)
        const user_id = req.session?.user?.id || 1; // fallback for testing

        if (!item_id) {
            return res.status(400).send("Item ID missing");
        }

        // 👉 INSERT INTO REQUEST TABLE (adjust if needed)
        await db.query(
            "INSERT INTO requests (item_id, user_id, status) VALUES ($1, $2, 'pending')",
            [item_id, user_id]
        );

        res.json({ success: true, message: "Request sent!" });

    } catch (err) {
        console.error("❌ REQUEST ERROR:", err);
        res.status(500).send("Request failed");
    }
};