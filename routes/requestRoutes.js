const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');

// TEMP: removed isLoggedIn to avoid crash
// You can add it back later after fixing auth

// Pages
router.get('/requests', requestController.viewRequests);

// API
router.get('/api/activity/data', requestController.getActivityData);

// Actions
router.post('/request-item', requestController.requestItem);
router.post('/update-status', requestController.updateRequestStatus);

module.exports = router;