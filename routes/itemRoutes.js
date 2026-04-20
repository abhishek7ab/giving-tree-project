const express = require('express');
const router = express.Router();

const itemController = require('../controllers/itemController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

// ✅ DEBUG CHECK (VERY IMPORTANT)
console.log("ITEM CONTROLLER CHECK:", itemController);

// ✅ Cloudinary setup
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'giving-tree',
        allowed_formats: ['jpg', 'png', 'jpeg']
    }
});

const upload = multer({ storage });

// ================= SAFE ROUTE HELPER =================
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
router.get('/items', isLoggedIn, safe(itemController.getItems));
router.get('/my-items', isLoggedIn, safe(itemController.showMyItems));
router.get('/post-item', isLoggedIn, safe(itemController.showPostItem));
router.get('/admin/dashboard', isLoggedIn, isAdmin, safe(itemController.showAdminPanel));

// API Data
router.get('/api/items/data', isLoggedIn, safe(itemController.getItemsData));
router.get('/api/my-items/data', isLoggedIn, safe(itemController.getMyItemsData));
router.get('/api/admin/data', isLoggedIn, isAdmin, safe(itemController.getAdminData));
router.get('/api/items/recent', safe(itemController.getRecentItems));

// Forms / Actions
router.post('/post-item', isLoggedIn, safe(itemController.postItem));
router.post('/admin/delete-item', isLoggedIn, isAdmin, safe(itemController.deleteItem));

module.exports = router;