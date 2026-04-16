const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { isLoggedIn } = require('../middleware/authMiddleware');

// Pages
router.get('/requests', isLoggedIn, requestController.viewRequests);

// Data API
router.get('/api/activity/data', isLoggedIn, requestController.getActivityData);

// Actions
router.post('/request-item', isLoggedIn, requestController.requestItem);
router.post('/update-status', isLoggedIn, requestController.updateRequestStatus);

module.exports = router;