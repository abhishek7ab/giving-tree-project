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
        console.error("GET ITEMS ERROR:", err.message);
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
        console.error("MY ITEMS ERROR:", err.message);
        res.json({ error: "Database error" });
    }
};

// ================= 3. ADMIN PANEL =================
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
        console.error("ADMIN ERROR:", err.message);
        res.json({ error: "Admin data error" });
    }
};

// ================= 4. SHOW POST ITEM PAGE =================
exports.showPostItem = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/post-item.html'));
};

// ================= 5. POST ITEM (THE FIX) =================
exports.postItem = async (req, res) => {
    console.log("--- DEBUG: postItem triggered ---");
    try {
        // 1. SAFETY CHECK: If req.body is undefined, make it an empty object so it doesn't crash
        const body = req.body || {};
        const { title, description, location } = body;

        // 2. LOGGING: This will show up in your Vercel logs so we can see what happened
        console.log("Received Body:", body);
        console.log("Received File:", req.file);

        if (!title) {
            return res.status(400).send("<h1>Form Error</h1><p>The server did not receive your text data. Please ensure your HTML form has enctype='multipart/form-data' and exactly one form tag.</p>");
        }

        const image = req.file ? req.file.path : null;
        
        // Use the mocked session from our JWT middleware
        const user_id = req.session?.user?.id;

        if (!user_id) {
            return res.status(401).send("Error: Session missing. Please logout and login again.");
        }

        if (!image) {
            return res.status(400).send("Error: Image upload failed. Ensure Cloudinary keys are correct in Vercel.");
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