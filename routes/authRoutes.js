const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);

router.post('/register', authController.register);
router.post('/login', authController.loginUser);

router.get('/logout', authController.logoutUser);

module.exports = router;