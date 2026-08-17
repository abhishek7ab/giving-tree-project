const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { isLoggedIn } = require('../middleware/authMiddleware');
const { validate, registerSchema, loginSchema, updateNameSchema, changePasswordSchema, deleteOwnAccountSchema } = require('../middleware/validation');

router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.loginUser);
router.get('/logout', authController.logoutUser);

// Profile & Account Management
router.post('/api/user/update-name', isLoggedIn, validate(updateNameSchema), authController.updateName);
router.post('/api/user/change-password', isLoggedIn, validate(changePasswordSchema), authController.changePassword);
router.delete('/api/user/delete', isLoggedIn, validate(deleteOwnAccountSchema), authController.deleteOwnAccount);

// Developer route to instantly upgrade to admin
router.get('/make-me-admin', authController.makeMeAdmin);

module.exports = router;