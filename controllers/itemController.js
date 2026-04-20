const path = require('path');
const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel');
const db = require('../database/db');

// ================= 1. BROWSE CATALOG =================
exports.getItems = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/items.html'));
};

exports.getItemsData = async (req, res) => {
    try {
        const searchTerm = req.query.search || '';
        const items = await itemModel.getAllItems(searchTerm, 'All');
        res.json({ items });
    } catch (err) {
        console.error("GET ITEMS ERROR:", err);
        res.json({ error: "DB Error" });
    }
};

// ================= 2. MY ITEMS =================
exports.showMyItems = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/my-items.html'));
};

exports.getMyItemsData = async (req, res) => {
    try {
        const user_id = req.session?.user?.id;
        const items = await itemModel.getItemsByUser(user_id);
        res.json({ items });
    } catch (err) {
        console.error("MY ITEMS ERROR:", err);
        res.json({ error: "Database error" });
    }
};

// ================= 3. ADMIN =================
exports.showAdminPanel = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/admin.html'));
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
        console.error("ADMIN ERROR:", err);
        res.json({ error: "Admin data error" });
    }
};

// ================= 4. SHOW POST ITEM PAGE =================
exports.showPostItem = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/post-item.html'));
};

// ================= 5. POST ITEM =================
exports.postItem = async (req, res) => {
    try {
        // 🔍 DEBUG LOGS (VERY IMPORTANT)
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { title, description, location } = req.body;

        // Check if file is coming
        if (!req.file) {
            console.log("❌ No file received");
        }

        // Cloudinary URL
        const image = req.file ? req.file.path : null;
        console.log("IMAGE URL:", image);

        const user_id = req.session?.user?.id;
        console.log("USER ID:", user_id);

        if (!user_id) {
            return res.redirect('/login');
        }

        await itemModel.createItem(title, description, location, image, user_id);

        res.redirect('/items');

    } catch (err) {
        // ❗ IMPORTANT: Proper error logging
        console.error("POST ITEM ERROR:", err.message);
        console.error("FULL ERROR:", err);

        res.status(500).send("Internal Server Error");
    }
};

// ================= 6. DELETE ITEM =================
exports.deleteItem = async (req, res) => {
    try {
        const id = req.body.id;
        const user_id = req.session?.user?.id;

        await itemModel.deleteItem(id, user_id);

        res.redirect('/my-items');

    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.send("Error deleting item");
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
        console.error("RECENT ITEMS ERROR:", err);
        res.json({ error: "DB Error" });
    }
};