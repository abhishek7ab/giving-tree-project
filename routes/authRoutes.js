const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Pages
router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);

// Actions
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);

// 🔥 Logout (IMPORTANT)
router.get('/logout', authController.logoutUser);

module.exports = router;