const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware'); 
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'assets/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Pages
router.get('/items', isLoggedIn, itemController.getItems);
router.get('/my-items', isLoggedIn, itemController.showMyItems);
router.get('/post-item', isLoggedIn, itemController.showPostItem);
router.get('/admin/dashboard', isLoggedIn, isAdmin, itemController.showAdminPanel);

// API JSON Data
router.get('/api/items/data', isLoggedIn, itemController.getItemsData);
router.get('/api/my-items/data', isLoggedIn, itemController.getMyItemsData);
router.get('/api/admin/data', isLoggedIn, isAdmin, itemController.getAdminData);
router.get('/api/items/recent', itemController.getRecentItems); // ✅ moved here

// Forms / Actions
router.post('/post-item', isLoggedIn, upload.single('image'), itemController.postItem);
router.post('/delete-item', isLoggedIn, itemController.deleteItem);
router.post('/admin/delete-item', isLoggedIn, isAdmin, itemController.deleteItem);

module.exports = router;