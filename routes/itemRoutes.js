const express = require('express');
const router = express.Router();

const itemController = require('../controllers/itemController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

// Multer (Cloudinary upload)
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Safe wrapper
const safe = (fn) => {
    return (req, res, next) => {
        if (!fn) {
            console.error("❌ Missing controller function!");
            return res.status(500).send("Server configuration error");
        }
        return fn(req, res, next);
    };
};

// ================= ROUTES =================

// Pages
router.get('/items', safe(itemController.getItems));
router.get('/my-items', safe(itemController.showMyItems));
router.get('/post-item', safe(itemController.showPostItem));
router.get('/admin/dashboard', isLoggedIn, isAdmin, safe(itemController.showAdminPanel));

// API
router.get('/api/items/data', safe(itemController.getItemsData));
router.get('/api/my-items/data', safe(itemController.getMyItemsData));
router.get('/api/admin/data', isLoggedIn, isAdmin, safe(itemController.getAdminData));
router.get('/api/items/recent', safe(itemController.getRecentItems));

// Actions
router.post('/post-item', upload.single('image'), itemController.postItem);
router.post('/admin/delete-item', isLoggedIn, isAdmin, safe(itemController.deleteItem));

module.exports = router;