const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer storage using Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'giving-tree',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
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
router.get('/api/items/recent', itemController.getRecentItems);

// Forms / Actions
router.post('/post-item', isLoggedIn, upload.single('image'), itemController.postItem);
router.post('/delete-item', isLoggedIn, itemController.deleteItem);
router.post('/admin/delete-item', isLoggedIn, isAdmin, itemController.deleteItem);

module.exports = router;