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
    console.log("--- DEBUG: postItem triggered ---");
    try {
        const body = req.body || {};
        const { title, description, location } = body;

        console.log("Received Body:", body);
        console.log("Received File:", req.file);

        if (!title) {
            return res.status(400).send("<h1>Form Error</h1><p>Missing title. Check form enctype and inputs.</p>");
        }

        const image = req.file ? req.file.path : null;
        const user_id = req.session?.user?.id;

        if (!user_id) {
            return res.status(401).send("Error: Session missing. Please login again.");
        }

        if (!image) {
            return res.status(400).send("Error: Image upload failed. Check Cloudinary config.");
        }

        await itemModel.createItem(title, description, location, image, user_id);
        res.redirect('/items');

    } catch (err) {
        console.error("DETAILED ERROR:", err);
        res.status(500).json({
            error: "Upload Failed",
            message: err.message
        });
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