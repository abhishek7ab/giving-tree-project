const express = require('express');
const router = express.Router();

const itemController = require('../controllers/itemController');
const { isLoggedIn, isAdmin } = require('../middleware/authMiddleware');
const { validate, postItemSchema, editItemSchema, getItemsQuerySchema, adminDeleteSchema } = require('../middleware/validation');

const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  }
});

// Pages
router.get('/items', itemController.getItems);
router.get('/my-items', itemController.showMyItems);
router.get('/post-item', itemController.showPostItem);
router.get('/admin/dashboard', isLoggedIn, isAdmin, itemController.showAdminPanel);

// API
router.get('/api/items/data', validate(getItemsQuerySchema), itemController.getItemsData);
router.get('/api/items/recent', itemController.getRecentItems);
router.get('/api/items/:id', itemController.getItemDetail);
router.put('/api/items/:id', isLoggedIn, validate(editItemSchema), itemController.updateItem);
router.patch('/api/items/:id/status', isLoggedIn, itemController.updateItemStatus);

router.get('/api/my-items/data', isLoggedIn, itemController.getMyItemsData);
router.get('/api/admin/data', isLoggedIn, isAdmin, itemController.getAdminData);

// Wishlist / Saved Items
router.post('/api/items/:id/save', isLoggedIn, itemController.saveItem);
router.delete('/api/items/:id/save', isLoggedIn, itemController.unsaveItem);
router.get('/api/saved-items', isLoggedIn, itemController.getSavedItems);
router.get('/api/user-saved-ids', itemController.getUserSavedIds);

// Actions
router.post('/post-item', isLoggedIn, upload.single('image'), validate(postItemSchema), itemController.postItem);
router.post('/delete-item', isLoggedIn, validate(adminDeleteSchema), itemController.deleteItem);
router.post('/admin/delete-item', isLoggedIn, validate(adminDeleteSchema), itemController.deleteItem);
router.post('/admin/delete-user', isLoggedIn, isAdmin, validate(adminDeleteSchema), itemController.deleteUser);

router.get('/delete-item', (req, res) => res.redirect('/my-items.html'));
router.get('/admin/delete-item', (req, res) => res.redirect('/admin/dashboard'));
router.get('/admin/delete-user', (req, res) => res.redirect('/admin/dashboard'));

module.exports = router;