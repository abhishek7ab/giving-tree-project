const express = require('express');
const router = express.Router();

const wishController = require('../controllers/wishController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// Public endpoints
router.get('/api/wishes', wishController.getWishes);
router.get('/api/wishes/match', wishController.getMatchingWishes);

// Protected endpoints
router.post('/api/wishes', isLoggedIn, wishController.createWish);
router.get('/api/wishes/my', isLoggedIn, wishController.getMyWishes);
router.post('/api/wishes/:id/fulfill', isLoggedIn, wishController.fulfillWish);
router.delete('/api/wishes/:id', isLoggedIn, wishController.deleteWish);

module.exports = router;
