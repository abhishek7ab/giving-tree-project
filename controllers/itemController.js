const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../config/cloudinary');
const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel');
const db = require('../database/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set before starting the server.');

// Helper: extract user from JWT cookie
function getUserFromReq(req) {
    try {
        const token = req.cookies?.token;
        if (!token) return null;
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// ================= 1. BROWSE CATALOG =================
exports.getItems = (req, res) => {
    return res.redirect(`/items.html`);
};

exports.getItemsData = async (req, res) => {
    try {
        const searchTerm = String(req.query.search || '').trim();
        const category = String(req.query.category || 'All').trim();
        const condition = String(req.query.condition || 'All').trim();
        const page = parseInt(req.query.page, 10) || null;
        const limit = parseInt(req.query.limit, 10) || null;

        const items = await itemModel.getAllItems(searchTerm, category, condition, true, page, limit);
        const totalCount = await itemModel.getItemsCount(searchTerm, category, condition, true);

        res.json({
            items,
            totalCount,
            page: page || 1,
            totalPages: limit ? Math.ceil(totalCount / limit) : 1
        });
    } catch (err) {
        console.error("GET ITEMS ERROR:", err);
        res.status(500).json({ error: err.message });
    }
};

// ================= 2. MY ITEMS =================
exports.showMyItems = (req, res) => {
    return res.redirect(`/my-items.html`);
};

exports.getMyItemsData = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.status(401).json({ error: "Not logged in" });

        const items = await itemModel.getItemsByUser(user.id);
        res.json({ items });

    } catch (err) {
        console.error(err);
        res.json({ error: "Database error" });
    }
};

// ================= 3. ADMIN =================
exports.showAdminPanel = (req, res) => {
    return res.redirect(`/admin.html`);
};

exports.getAdminData = async (req, res) => {
    try {
        const items = await itemModel.getAllItems('', 'All', 'All', true);
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
        console.error("GET ADMIN DATA ERROR:", err);
        res.status(500).json({ error: "Failed to load admin data" });
    }
};

// ================= 4. POST PAGE =================
exports.showPostItem = (req, res) => {
    return res.redirect(`/post-item.html`);
};

// ================= 5. POST ITEM =================
exports.postItem = async (req, res) => {
    try {
        const { title, description, location, category, condition, pickup_availability: pickupAvailability, weight_category: weightCategory, latitude, longitude } = req.body;

        const cleanTitle = String(title || '').trim();
        const cleanDescription = String(description || '').trim();
        const cleanLocation = String(location || '').trim();
        const lat = latitude !== undefined && latitude !== null && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
        const lng = longitude !== undefined && longitude !== null && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;
        const allowedCategories = ['Furniture', 'Electronics', 'Appliances', 'Books', 'Clothing', 'Kitchen & Dining', 'Baby & Kids', 'Sports & Outdoors', 'Home & Garden', 'Pet Supplies', 'Office & Study', 'Other'];
        const allowedConditions = ['New', 'Like new', 'Good', 'Fair', 'For repair'];

        if (!cleanTitle || !cleanDescription || !cleanLocation || !allowedCategories.includes(category) || !allowedConditions.includes(condition)) {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ error: 'Please complete all required item details.' });
            }
            return res.status(400).send('Please complete all required item details.');
        }

        if (!req.file) {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ error: 'Item image is required.' });
            }
            return res.status(400).send("File missing");
        }

        let image = '';
        
        // 1. Save locally to /assets/uploads/ for 100% reliable rendering
        try {
            const uploadsDir = path.join(__dirname, '../frontend/assets/uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const ext = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
            const filename = `item-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            const localFilePath = path.join(uploadsDir, filename);
            fs.writeFileSync(localFilePath, req.file.buffer);
            image = `/assets/uploads/${filename}`;
        } catch (localErr) {
            console.error("Local file save error:", localErr);
        }

        // 2. Also upload to Cloudinary as cloud backup
        try {
            const result = await uploadToCloudinary(req.file.buffer);
            if (!image) {
                image = result.secure_url;
            }
        } catch (cldErr) {
            console.error("Cloudinary upload fallback error:", cldErr);
        }

        if (!image) {
            image = '/assets/uploads/tv.jpg';
        }

        const user = getUserFromReq(req);
        if (!user) {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ error: 'Not logged in.' });
            }
            return res.status(401).send("Not logged in");
        }

        const newItem = await itemModel.createItem(
            cleanTitle,
            cleanDescription,
            cleanLocation,
            image,
            user.id,
            category,
            condition,
            String(pickupAvailability || '').trim(),
            String(weightCategory || 'Light (Easy to carry)').trim(),
            lat,
            lng
        );

        if (req.headers.accept?.includes('application/json') || req.xhr) {
            return res.json({ success: true, item: newItem, message: 'Item shared successfully!' });
        }

        res.redirect('/items.html');

    } catch (err) {
        console.error("POST ITEM ERROR:", err);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Failed to publish item. Please try again.' });
        }
        res.status(500).send("Server error");
    }
};

// ================= ITEM DETAIL =================
exports.getItemDetail = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid item ID' });
        const item = await itemModel.getItemById(id);
        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (err) {
        console.error("GET ITEM DETAIL ERROR:", err);
        res.status(500).json({ error: 'Failed to fetch item detail' });
    }
};

// ================= UPDATE ITEM =================
exports.updateItem = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not logged in' });
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid item ID' });

        const updated = await itemModel.updateItem(id, user.id, req.body);
        if (!updated) return res.status(404).json({ error: 'Item not found or you are not the owner' });

        res.json({ success: true, item: updated });
    } catch (err) {
        console.error("UPDATE ITEM ERROR:", err);
        res.status(500).json({ error: 'Failed to update item' });
    }
};

// ================= UPDATE ITEM STATUS =================
exports.updateItemStatus = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not logged in' });
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!['available', 'reserved', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updated = await itemModel.updateItemStatus(id, user.id, status);
        if (!updated) return res.status(404).json({ error: 'Item not found or you are not the owner' });

        res.json({ success: true, item: updated });
    } catch (err) {
        console.error("UPDATE ITEM STATUS ERROR:", err);
        res.status(500).json({ error: 'Failed to update item status' });
    }
};

// ================= WISHLIST / SAVED ITEMS =================
exports.saveItem = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not logged in' });
        const itemId = parseInt(req.params.id, 10);
        if (!itemId) return res.status(400).json({ error: 'Invalid item ID' });

        await itemModel.saveItem(user.id, itemId);
        res.json({ success: true, saved: true });
    } catch (err) {
        console.error("SAVE ITEM ERROR:", err);
        res.status(500).json({ error: 'Failed to save item' });
    }
};

exports.unsaveItem = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not logged in' });
        const itemId = parseInt(req.params.id, 10);
        if (!itemId) return res.status(400).json({ error: 'Invalid item ID' });

        await itemModel.unsaveItem(user.id, itemId);
        res.json({ success: true, saved: false });
    } catch (err) {
        console.error("UNSAVE ITEM ERROR:", err);
        res.status(500).json({ error: 'Failed to unsave item' });
    }
};

exports.getSavedItems = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.status(401).json({ error: 'Not logged in' });
        const items = await itemModel.getSavedItems(user.id);
        res.json({ items });
    } catch (err) {
        console.error("GET SAVED ITEMS ERROR:", err);
        res.status(500).json({ error: 'Failed to fetch saved items' });
    }
};

exports.getUserSavedIds = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        if (!user) return res.json({ savedItemIds: [] });
        const ids = await itemModel.getUserSavedItemIds(user.id);
        res.json({ savedItemIds: ids });
    } catch (err) {
        res.json({ savedItemIds: [] });
    }
};

// ================= DELETE =================
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.body;
        const user = getUserFromReq(req);
        const isJson = req.headers.accept?.includes('application/json');

        if (!user) {
            if (isJson) return res.status(401).json({ error: 'Not logged in' });
            return res.status(401).send("Not logged in");
        }

        if (user.role === 'admin') {
            await itemModel.deleteItemByAdmin(id);
        } else {
            await itemModel.deleteItem(id, user.id);
        }

        if (isJson) return res.json({ success: true, message: 'Item deleted successfully' });

        const referer = req.headers.referer || '';
        if (user.role === 'admin' && (referer.includes('admin') || req.originalUrl.includes('admin'))) {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/my-items.html');

    } catch (err) {
        console.error("DELETE ITEM ERROR:", err);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Error deleting item' });
        }
        res.status(500).send("Error deleting item");
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.body;
        const targetUserId = Number(id);
        const currentUser = getUserFromReq(req);
        const isJson = req.headers.accept?.includes('application/json');

        if (!currentUser) {
            if (isJson) return res.status(401).json({ error: 'Not logged in' });
            return res.status(401).send("Not logged in");
        }
        if (!targetUserId) {
            if (isJson) return res.status(400).json({ error: 'Invalid user id' });
            return res.status(400).send("Invalid user id");
        }

        const deletedCount = await userModel.deleteUserById(targetUserId);
        if (!deletedCount) {
            if (isJson) return res.status(400).json({ error: 'Admin users cannot be deleted.' });
            return res.status(400).send("Admin users cannot be deleted.");
        }

        if (isJson) return res.json({ success: true, message: 'User deleted successfully' });
        return res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Error deleting user' });
        }
        return res.status(500).send("Error deleting user");
    }
};

// ================= RECENT =================
exports.getRecentItems = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM items WHERE status='available' AND archived_at IS NULL ORDER BY id DESC LIMIT 3"
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

        const user = getUserFromReq(req);
        if (!user) return res.status(401).send("Not logged in");

        await db.query(
            "INSERT INTO requests (item_id, user_id, status) VALUES ($1,$2,'pending')",
            [item_id, user.id]
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).send("Request failed");
    }
};
