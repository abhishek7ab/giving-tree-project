const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { isLoggedIn } = require('../middleware/authMiddleware');
const { validate, registerSchema, loginSchema, updateNameSchema, changePasswordSchema, deleteOwnAccountSchema, adminSetupSchema } = require('../middleware/validation');

router.get('/login', authController.showLogin);
router.get('/register', authController.showRegister);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.loginUser);
router.get('/logout', authController.logoutUser);

// Profile & Account Management
router.post('/api/user/update-name', isLoggedIn, validate(updateNameSchema), authController.updateName);
router.post('/api/user/change-password', isLoggedIn, validate(changePasswordSchema), authController.changePassword);
router.delete('/api/user/delete', isLoggedIn, validate(deleteOwnAccountSchema), authController.deleteOwnAccount);

// Secure setup route to upgrade to admin with valid setup key (POST only with CSRF protection)
router.post('/make-me-admin', isLoggedIn, validate(adminSetupSchema), authController.makeMeAdmin);

module.exports = router;