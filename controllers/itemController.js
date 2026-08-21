const fs = require('fs');
const path = require('path');
const { uploadToCloudinary } = require('../config/cloudinary');
const itemModel = require('../models/itemModel');
const userModel = require('../models/userModel');
const requestModel = require('../models/requestModel');
const auditModel = require('../models/auditModel');
const db = require('../database/db');
const { verifyToken } = require('../config/jwt');
const { isMasterAdmin } = require('../middleware/authMiddleware');

// Helper: extract user from JWT cookie
function getUserFromReq(req) {
    try {
        const token = req.cookies?.token;
        if (!token) return null;
        return verifyToken(token);
    } catch (e) {
        return null;
    }
}

// Magic bytes validation for uploaded image buffers (JPEG, PNG, WebP, GIF)
function isValidImageBuffer(buffer) {
    if (!buffer || buffer.length < 4) return false;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // WebP: RIFF ... WEBP
    if (buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
    // GIF: GIF8
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
    return false;
}

// Privacy coordinate fuzzing for public catalog (protects donors' exact home address while keeping neighborhood locality accurate)
function fuzzCoordinate(coord) {
    if (coord === null || coord === undefined || isNaN(coord)) return coord;
    // Snap to 3 decimal places (~110m precision)
    return Math.round(Number(coord) * 1000) / 1000;
}

function sanitizeItemForPublic(item, viewerUserId = null, isAdmin = false) {
    if (!item) return item;
    const isOwner = viewerUserId && Number(item.user_id) === Number(viewerUserId);
    if (isOwner || isAdmin) {
        return item; // Retain exact coordinates for item owner and admins
    }
    return {
        ...item,
        latitude: fuzzCoordinate(item.latitude),
        longitude: fuzzCoordinate(item.longitude)
    };
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

        const user = getUserFromReq(req);
        const isAdmin = user?.role === 'admin' || isMasterAdmin(user?.email);

        const items = await itemModel.getAllItems(searchTerm, category, condition, true, page, limit);
        const totalCount = await itemModel.getItemsCount(searchTerm, category, condition, true);

        // Apply privacy coordinate fuzzing for non-owners/public viewers
        const sanitizedItems = items.map(i => sanitizeItemForPublic(i, user?.id, isAdmin));

        res.json({
            items: sanitizedItems,
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
        const recentAuditLogs = await auditModel.getRecentAuditLogs(20);

        // Record audit event for administrative dashboard access
        auditModel.logEvent({
            userId: req.user?.id,
            userEmail: req.user?.email,
            action: 'ADMIN_DASHBOARD_ACCESS',
            req
        });

        res.json({
            items,
            users,
            recentAuditLogs,
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

        if (!isValidImageBuffer(req.file.buffer)) {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ error: 'Uploaded file is not a valid image format.' });
            }
            return res.status(400).send("Uploaded file is not a valid image format.");
        }

        let image = '';
        
        // 1. Try Cloudinary first (ensures permanent URLs on Vercel / serverless deployments)
        try {
            const result = await uploadToCloudinary(req.file.buffer);
            if (result && result.secure_url) {
                image = result.secure_url;
            }
        } catch (cldErr) {
            console.warn("Cloudinary upload fallback note:", cldErr.message);
        }

        // 2. Local filesystem storage fallback (for local development or persistent hosting)
        if (!image) {
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
                console.warn("Local file save note:", localErr.message);
            }
        }

        // 3. Base64 Data URI fallback if both cloud and local disk writes are unavailable
        if (!image && req.file && req.file.buffer) {
            const mime = req.file.mimetype || 'image/jpeg';
            image = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
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

        // Deliver Gratitude In-App Notification to Donor
        try {
            if (user.email) {
                await requestModel.createNotification({
                    userEmail: user.email,
                    type: 'donation_published',
                    title: 'Thank You for Giving Back! 🌿',
                    body: `"${cleanTitle}" has been listed in the ${cleanLocation} catalog. Thank you for your generosity and keeping Pune zero-waste!`,
                    requestId: null
                });
            }
        } catch (notifErr) {
            console.warn('Donor notification note:', notifErr.message);
        }

        if (req.headers.accept?.includes('application/json') || req.xhr) {
            return res.json({
                success: true,
                item: newItem,
                message: 'Item shared successfully!',
                gratitude: {
                    title: 'Thank You for Your Generosity! 🌿',
                    subtitle: `Your donation is now live for neighbors in ${cleanLocation}.`,
                    message: `By donating "${cleanTitle}" instead of throwing it away, you are helping build a zero-waste, connected Pune community.`,
                    impactPoints: 50,
                    wasteDivertedKg: 4.5,
                    locality: cleanLocation
                }
            });
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
        const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');

        if (!user) {
            if (isJson) return res.status(401).json({ error: 'Not logged in' });
            return res.status(401).send("Not logged in");
        }

        if (user.role === 'admin') {
            await itemModel.deleteItemByAdmin(id);
            auditModel.logEvent({
                userId: user.id,
                userEmail: user.email,
                action: 'ADMIN_DELETE_ITEM',
                details: { itemId: id },
                req
            });
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
        const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');

        if (!currentUser) {
            if (isJson) return res.status(401).json({ error: 'Not logged in' });
            return res.status(401).send("Not logged in");
        }
        if (!targetUserId) {
            if (isJson) return res.status(400).json({ error: 'Invalid user id' });
            return res.status(400).send("Invalid user id");
        }

        // Lockout Prevention: An admin cannot delete their own active account through the admin dashboard
        if (Number(currentUser.id) === targetUserId) {
            if (isJson) return res.status(400).json({ error: 'You cannot delete your own admin account.' });
            return res.status(400).send("You cannot delete your own admin account.");
        }

        // Master Admin Protection: Master Admin cannot be deleted by secondary admins
        const targetUserRes = await db.query('SELECT id, email, role FROM users WHERE id = $1', [targetUserId]);
        const targetUser = targetUserRes.rows[0];
        if (targetUser && isMasterAdmin(targetUser.email)) {
            if (isJson) return res.status(403).json({ error: 'Master Admin account cannot be deleted.' });
            return res.status(403).send("Master Admin account cannot be deleted.");
        }

        const deletedCount = await userModel.deleteUserById(targetUserId);
        if (!deletedCount) {
            if (isJson) return res.status(400).json({ error: 'Admin users cannot be deleted.' });
            return res.status(400).send("Admin users cannot be deleted.");
        }

        auditModel.logEvent({
            userId: currentUser.id,
            userEmail: currentUser.email,
            action: 'ADMIN_DELETE_USER',
            details: { targetUserId, targetEmail: targetUser?.email },
            req
        });

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

// ================= AUDIT LOGS =================
exports.getAuditLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 50;
        const logs = await auditModel.getRecentAuditLogs(limit);
        res.json({ logs });
    } catch (err) {
        console.error("GET AUDIT LOGS ERROR:", err);
        res.status(500).json({ error: "Failed to load audit logs" });
    }
};

// ================= RECENT =================
exports.getRecentItems = async (req, res) => {
    try {
        const user = getUserFromReq(req);
        const isAdmin = user?.role === 'admin' || isMasterAdmin(user?.email);

        const result = await db.query(
            "SELECT id, title, description, location, image, user_id, status, category, condition, pickup_availability, weight_category, latitude, longitude, created_at FROM items WHERE status='available' AND archived_at IS NULL ORDER BY id DESC LIMIT 3"
        );
        const sanitized = result.rows.map(i => sanitizeItemForPublic(i, user?.id, isAdmin));
        res.json(sanitized);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB Error" });
    }
};
