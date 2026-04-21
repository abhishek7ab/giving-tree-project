const { uploadToCloudinary } = require('../config/cloudinary');
const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel');
const db = require('../database/db');

const FRONTEND_BASE_URL = 'https://giving-tree-frontend.vercel.app';

// ================= 1. BROWSE CATALOG =================
exports.getItems = (req, res) => {
    return res.redirect(`${FRONTEND_BASE_URL}/items.html`);
};

exports.getItemsData = async (req, res) => {
    try {
        const searchTerm = req.query.search || '';
        const items = await itemModel.getAllItems(searchTerm, 'All');
        res.json({ items });
    } catch (err) {
        console.error(err);
        res.json({ error: "DB Error" });
    }
};

// ================= 2. MY ITEMS =================
exports.showMyItems = (req, res) => {
    return res.redirect(`${FRONTEND_BASE_URL}/my-items.html`);
};

exports.getMyItemsData = async (req, res) => {
    try {
        const user_id = req.session?.user?.id;
        if (!user_id) return res.status(401).json({ error: "Not logged in" });

        const items = await itemModel.getItemsByUser(user_id);
        res.json({ items });

    } catch (err) {
        console.error(err);
        res.json({ error: "Database error" });
    }
};

// ================= 3. ADMIN =================
exports.showAdminPanel = (req, res) => {
    return res.redirect(`${FRONTEND_BASE_URL}/admin.html`);
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
        console.error(err);
        res.json({ error: "Admin error" });
    }
};

// ================= 4. POST PAGE =================
exports.showPostItem = (req, res) => {
    return res.redirect(`${FRONTEND_BASE_URL}/post-item.html`);
};

// ================= 5. POST ITEM =================
exports.postItem = async (req, res) => {
    try {
        const { title, description, location } = req.body;

        if (!req.file) {
            return res.status(400).send("File missing");
        }

        const result = await uploadToCloudinary(req.file.buffer);
        const image = result.secure_url;

        // ❌ removed fallback user_id = 1
        const user_id = req.session?.user?.id;
        if (!user_id) return res.status(401).send("Not logged in");

        await itemModel.createItem(title, description, location, image, user_id);

        res.redirect('/items');

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};

// ================= DELETE =================
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.body;
        const user_id = req.session?.user?.id;

        if (!user_id) return res.status(401).send("Not logged in");

        await itemModel.deleteItem(id, user_id);
        res.redirect('/my-items');

    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting item");
    }
};

// ================= RECENT =================
exports.getRecentItems = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM items WHERE status='available' ORDER BY id DESC LIMIT 3"
        );
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB Error" });
    }
};

// ================= REQUEST =================
exports.requestItem = async (req, res) => {
    try {
        const { item_id } = req.body;

        const user_id = req.session?.user?.id;
        if (!user_id) return res.status(401).send("Not logged in");

        await db.query(
            "INSERT INTO requests (item_id, user_id, status) VALUES ($1,$2,'pending')",
            [item_id, user_id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).send("Request failed");
    }
};