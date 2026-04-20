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
    console.log("--- DEBUG: POST ITEM START ---");
    
    try {
        // SAFETY FALLBACK: Prevents the "Cannot destructure title of undefined" crash
        const body = req.body || {};
        const { title, description, location } = body;

        // 1. Validate Text Data Received
        if (!title || !description) {
            console.error("DEBUG ERROR: req.body is empty. Check HTML enctype.");
            return res.status(400).send("Error: Server did not receive form text. Ensure your form has enctype='multipart/form-data'.");
        }

        // 2. Validate Image Received (Cloudinary URL)
        const image = req.file ? req.file.path : null;
        if (!image) {
            console.error("DEBUG ERROR: No file path found in req.file");
            return res.status(400).send("Error: Image file not received. Please try again.");
        }

        // 3. Validate User (From JWT-to-Session middleware bridge)
        const user_id = req.session?.user?.id;
        if (!user_id) {
            console.error("DEBUG ERROR: No user_id in session/token");
            return res.status(401).send("Error: Session expired. Please log in again.");
        }

        // 4. Save to Database
        await itemModel.createItem(title, description, location, image, user_id);
        
        console.log("DEBUG SUCCESS: Item Shared Successfully!");
        res.redirect('/items');

    } catch (err) {
        console.error("POST ITEM CATCH ERROR:", err);
        res.status(500).json({
            error: "Submission Failed",
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