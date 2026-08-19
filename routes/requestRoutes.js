const express = require('express');
const router = express.Router();

const requestController = require('../controllers/requestController');
const { isLoggedIn } = require('../middleware/authMiddleware');
const { validate, requestItemSchema, updateStatusSchema, sendMessageSchema, reviewSchema } = require('../middleware/validation');

// Pages
router.get('/requests', requestController.viewRequests);

// API
router.get('/api/activity/data', isLoggedIn, requestController.getActivityData);
router.get('/api/requests/:id/messages', isLoggedIn, requestController.getRequestMessages);
router.post('/api/requests/:id/messages', isLoggedIn, validate(sendMessageSchema), requestController.sendRequestMessage);
router.get('/api/notifications', isLoggedIn, requestController.getNotifications);
router.get('/notifications', isLoggedIn, requestController.getNotifications);
router.post('/api/notifications/read-all', isLoggedIn, requestController.markAllNotificationsRead);
router.post('/api/notifications/mark-all-read', isLoggedIn, requestController.markAllNotificationsRead);
router.post('/api/notifications/:id/read', isLoggedIn, requestController.markNotificationRead);

// Reviews & Public Profiles
router.post('/api/reviews', isLoggedIn, validate(reviewSchema), requestController.createReview);
router.get('/api/users/:id/public', requestController.getPublicUserProfile);
router.get('/api/users/:id/reviews', requestController.getUserReviews);

// Actions
router.post('/request-item', isLoggedIn, validate(requestItemSchema), requestController.requestItem);
router.post('/update-status', isLoggedIn, validate(updateStatusSchema), requestController.updateRequestStatus);

module.exports = router;
