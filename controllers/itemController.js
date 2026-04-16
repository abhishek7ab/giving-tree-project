const path = require('path');
const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel'); 

// ================= 1. BROWSE CATALOG =================
// 1. Serves the file you just created
exports.getItems = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/items.html'));
};

// 2. The API that the "Fetch" in the HTML calls
exports.getItemsData = (req, res) => {
    const searchTerm = req.query.search || '';
    // Use your existing itemModel to get data
    itemModel.getAllItems(searchTerm, 'All', (err, results) => {
        if (err) return res.json({ error: "DB Error" });
        res.json({ items: results });
    });
};
// ================= 2. MY SHARED ITEMS =================
exports.showMyItems = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/my-items.html'));
};

exports.getMyItemsData = (req, res) => {
    const user_id = req.session.user.id;
    itemModel.getItemsByUser(user_id, (err, results) => {
        if (err) return res.json({ error: "Database error" });
        res.json({ items: results });
    });
};

// ================= 3. ADMIN PANEL =================
exports.showAdminPanel = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/admin.html'));
};

exports.getAdminData = (req, res) => {
    itemModel.getAllItems('', 'All', (err, items) => {
        if (err) return res.json({ error: "Items error" });
        userModel.getAllUsers((err, users) => {
            if (err) return res.json({ error: "Users error" });
            res.json({ items, users, stats: { totalItems: items.length, totalUsers: users.length } });
        });
    });
};

// ================= 4. POST ITEM =================
exports.showPostItem = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/post-item.html'));
};

exports.postItem = (req, res) => {
    const { title, description, location } = req.body;
    const image = req.file ? req.file.filename : null;
    const user_id = req.session.user.id;
    itemModel.createItem(title, description, location, image, user_id, (err) => {
        if (err) return res.send("Error posting item");
        res.redirect('/items');
    });
};

// ================= 5. DELETE ITEM =================
exports.deleteItem = (req, res) => {
    const id = req.body.id;
    const user_id = req.session.user.id;
    itemModel.deleteItem(id, user_id, (err) => {
        if (err) return res.send("Error deleting item");
        res.redirect('/my-items');
    });
};
exports.getRecentItems = (req, res) => {
    const sql = "SELECT * FROM items WHERE status = 'available' ORDER BY id DESC LIMIT 3";
    const db = require('../database/db');
    db.query(sql, (err, results) => {
        if (err) return res.json({ error: "DB Error" });
        res.json(results);
    });
};