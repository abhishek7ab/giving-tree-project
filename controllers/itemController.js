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
        console.error("ADMIN ERROR:", err.message);
        res.json({ error: "Admin data error" });
    }
};

// ================= 4. SHOW POST ITEM PAGE =================
exports.showPostItem = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/post-item.html'));
};

// ================= 5. POST ITEM =================
exports.postItem = async (req, res) => {
    // This will show up in Vercel Logs
    console.log("---> POST ITEM ATTEMPT START <---");

    try {
        const { title, description, location } = req.body;
        const image = req.file ? req.file.path : null;
        
        // Use the decoded JWT user id
        const user_id = req.session?.user?.id;

        if (!user_id) {
            return res.status(401).send("Error: You are not logged in. Please log in again.");
        }

        if (!image) {
            return res.status(400).send("Error: Image upload failed. Check Cloudinary settings.");
        }

        await itemModel.createItem(title, description, location, image, user_id);
        res.redirect('/items');

    } catch (err) {
        console.error("DETAILED ERROR:", err);
        // This will show the error on your CHROME BROWSER so you can read it!
        res.status(500).json({
            error: "Database or Upload Failed",
            message: err.message,
            stack: err.stack
        });
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
        console.error("DELETE ERROR:", err.message);
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
        console.error("RECENT ITEMS ERROR:", err.message);
        res.json({ error: "DB Error" });
    }
};