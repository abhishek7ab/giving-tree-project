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
        const results = await itemModel.getAllItems(searchTerm, 'All');
        res.json({ items: results });
    } catch (err) {
        console.error(err);
        res.json({ error: "DB Error" });
    }
};

// ================= 2. MY SHARED ITEMS =================
exports.showMyItems = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/my-items.html'));
};

exports.getMyItemsData = async (req, res) => {
    try {
        const user_id = req.session.user.id;
        const results = await itemModel.getItemsByUser(user_id);
        res.json({ items: results });
    } catch (err) {
        console.error(err);
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
        res.json({ items, users, stats: { totalItems: items.length, totalUsers: users.length } });
    } catch (err) {
        console.error(err);
        res.json({ error: "Admin data error" });
    }
};

// ================= 4. POST ITEM =================
exports.showPostItem = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/post-item.html'));
};

exports.postItem = async (req, res) => {
    try {
        const { title, description, location } = req.body;
        const image = req.file ? req.file.filename : null;
        const user_id = req.session.user.id;
        await itemModel.createItem(title, description, location, image, user_id);
        res.redirect('/items');
    } catch (err) {
        console.error(err);
        res.send("Error posting item");
    }
};

// ================= 5. DELETE ITEM =================
exports.deleteItem = async (req, res) => {
    try {
        const id = req.body.id;
        const user_id = req.session.user.id;
        await itemModel.deleteItem(id, user_id);
        res.redirect('/my-items');
    } catch (err) {
        console.error(err);
        res.send("Error deleting item");
    }
};

// ================= 6. RECENT ITEMS =================
exports.getRecentItems = async (req, res) => {
    try {
        const sql = "SELECT * FROM items WHERE status = 'available' ORDER BY id DESC LIMIT 3";
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json({ error: "DB Error" });
    }
};