const express = require('express');
const router = express.Router();

const itemController = require('../controllers/itemController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Pages
router.get('/items', itemController.getItems);
router.get('/my-items', itemController.showMyItems);
router.get('/post-item', itemController.showPostItem);
router.get('/admin/dashboard', isLoggedIn, isAdmin, itemController.showAdminPanel);

// API
router.get('/api/items/data', itemController.getItemsData);
router.get('/api/my-items/data', isLoggedIn, itemController.getMyItemsData);
router.get('/api/admin/data', isLoggedIn, isAdmin, itemController.getAdminData);
router.get('/api/items/recent', itemController.getRecentItems);

// Actions
router.post('/post-item', isLoggedIn, upload.single('image'), itemController.postItem);
router.post('/admin/delete-item', isLoggedIn, isAdmin, itemController.deleteItem);

module.exports = router;