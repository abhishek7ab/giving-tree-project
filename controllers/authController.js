const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('../config/jwt');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');

const isProduction = process.env.NODE_ENV === 'production';

const { ALLOWED_PUNE_LOCATIONS } = require('../middleware/validation');

// ================= SHOW LOGIN =================
exports.showLogin = (req, res) => {
    return res.redirect("/login.html");
};

exports.showRegister = (req, res) => {
    return res.redirect("/register.html");
};

// ================= REGISTER =================
exports.register = async (req, res) => {
    try {
        const { password } = req.body;
        const rawName = String(req.body.name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const rawCity = String(req.body.city || req.body.location || '').trim();
        const rawPhone = String(req.body.phone || '').trim();
        const phone = rawPhone !== '' ? rawPhone : null;
        const isJson = req.headers.accept?.includes('application/json');

        if (!rawName) {
            if (isJson) return res.status(400).json({ error: 'namerequired', message: 'Username / Name is compulsory.' });
            return res.redirect("/register.html?error=namerequired");
        }

        if (!rawCity) {
            if (isJson) return res.status(400).json({ error: 'locationrequired', message: 'Location is compulsory. Please select your neighborhood.' });
            return res.redirect("/register.html?error=locationrequired");
        }

        if (!ALLOWED_PUNE_LOCATIONS.includes(rawCity)) {
            if (isJson) return res.status(400).json({ error: 'locationinvalid', message: 'Location must be one of the 8 supported Pune neighborhood locations.' });
            return res.redirect("/register.html?error=locationinvalid");
        }

        if (!email || !password) {
            if (isJson) return res.status(400).json({ error: 'missingfields', message: 'Please complete all required fields.' });
            return res.redirect("/register.html?error=missingfields");
        }

        if (password.length < 6) {
            if (isJson) return res.status(400).json({ error: 'passwordshort', message: 'Password must be at least 6 characters.' });
            return res.redirect("/register.html?error=passwordshort");
        }

        if (phone) {
            if (!/^\d+$/.test(phone)) {
                if (isJson) return res.status(400).json({ error: 'phoneinvalid', message: 'Phone number must contain digits only.' });
                return res.redirect("/register.html?error=phoneinvalid");
            }

            if (phone.length !== 10) {
                const msg = phone.length > 10 ? 'Only 10 digits allowed.' : 'Below 10 digits not allowed.';
                if (isJson) return res.status(400).json({ error: 'phonelength', message: msg });
                return res.redirect(phone.length > 10 ? "/register.html?error=phoneover" : "/register.html?error=phoneunder");
            }
        }

        // Check if username/name is already taken
        const existingNameUser = await userModel.findUserByName(rawName);
        if (existingNameUser && existingNameUser.email.toLowerCase() !== email) {
            if (isJson) return res.status(400).json({ error: 'nameexists', message: 'This username/name is already taken. Please choose another.' });
            return res.redirect("/register.html?error=nameexists");
        }

        const existingUser = await userModel.findUserByEmail(email, true);

        if (existingUser && !existingUser.archived_at) {
            if (isJson) return res.status(400).json({ error: 'userexists', message: 'An account with this email already exists. Please log in instead.' });
            return res.redirect("/register.html?error=userexists");
        }

        await userModel.createUser(rawName, email, password, phone, rawCity);

        if (isJson) return res.json({ success: true, redirect: '/login.html' });
        return res.redirect("/login.html");

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        const isJson = req.headers.accept?.includes('application/json');
        if (err.code === 'NAME_EXISTS') {
            if (isJson) return res.status(400).json({ error: 'nameexists', message: 'This username/name is already taken. Please choose another.' });
            return res.redirect("/register.html?error=nameexists");
        }
        if (isJson) {
            return res.status(500).json({ error: 'servererror', message: 'Something went wrong. Please try again.' });
        }
        return res.redirect("/register.html?error=servererror");
    }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {
    try {
        const { password } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        const isJson = req.headers.accept?.includes('application/json');

        const user = await userModel.findUserByEmail(email);

        if (!user) {
            if (isJson) return res.status(400).json({ error: 'usernotfound', message: 'Your password or Gmail is incorrect. Please log in with correct credentials.' });
            return res.redirect("/login.html?error=usernotfound");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            if (isJson) return res.status(400).json({ error: 'wrongpassword', message: 'Your password or Gmail is incorrect. Please log in with correct credentials.' });
            return res.redirect("/login.html?error=wrongpassword");
        }

        const userRole = user.role || 'user';
        const redirectUrl = (userRole === 'admin' || user.email === 'badaveabhishek2004@gmail.com') ? '/admin.html' : '/index.html';

        const token = signToken(
            { id: user.id, role: userRole, name: user.name, email: user.email, city: user.city || 'Kothrud, Pune' }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        if (isJson) return res.json({ success: true, redirect: redirectUrl });
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'servererror', message: err.message || 'Unable to log in. Please try again.' });
        }
        return res.redirect("/login.html?error=servererror");
    }
};

// ================= UPDATE PROFILE NAME & LOCATION =================
exports.updateName = async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.user?.id;
        const newName = req.body.name !== undefined ? String(req.body.name).trim() : undefined;
        const newCity = req.body.city !== undefined ? String(req.body.city).trim() : undefined;

        if (!userId) return res.status(401).json({ error: 'Not logged in' });
        if (newName !== undefined && !newName) return res.status(400).json({ error: 'Please enter a valid name' });

        if (newCity !== undefined && newCity && !ALLOWED_PUNE_LOCATIONS.includes(newCity)) {
            return res.status(400).json({ error: 'Location must be one of the 8 supported Pune neighborhood locations.' });
        }

        const updatedUser = await userModel.updateUserProfile(userId, { name: newName, city: newCity });

        // Refresh JWT token with updated name and location
        const token = signToken(
            { id: updatedUser.id, role: updatedUser.role, name: updatedUser.name, email: updatedUser.email, city: updatedUser.city }
        );
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            name: updatedUser.name,
            city: updatedUser.city,
            message: 'Profile updated successfully!'
        });
    } catch (err) {
        console.error("UPDATE NAME ERROR:", err);
        if (err.code === 'NAME_EXISTS') {
            return res.status(400).json({ error: 'nameexists', message: 'This username/name is already taken. Please choose another.' });
        }
        return res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
};

// ================= CHANGE PASSWORD =================
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!userId) return res.status(401).json({ error: 'Not logged in' });
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please fill in all password fields.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        const db = require('../database/db');
        const userRes = await db.query('SELECT id, password FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

        return res.json({ success: true, message: 'Password changed successfully!' });
    } catch (err) {
        console.error("CHANGE PASSWORD ERROR:", err);
        return res.status(500).json({ error: 'Failed to change password' });
    }
};

// ================= DELETE OWN ACCOUNT =================
exports.deleteOwnAccount = async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not logged in' });

        const db = require('../database/db');
        const userRes = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userRes.rows[0]?.role === 'admin') {
            return res.status(400).json({ error: 'Admin account cannot be deleted.' });
        }

        await userModel.deleteUserById(userId);

        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined
        });

        return res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        console.error("DELETE ACCOUNT ERROR:", err);
        return res.status(500).json({ error: 'Failed to delete account' });
    }
};

// ================= LOGOUT =================
exports.logoutUser = (req, res) => {
        res.clearCookie('token', {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined
        });

    return res.redirect("/logout.html");
};

// ================= MAKE ME ADMIN =================
exports.makeMeAdmin = async (req, res) => {
    try {
        const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');
        const secretKey = req.body?.key || req.query?.key;
        const requiredSecret = process.env.ADMIN_SETUP_KEY;

        if (!requiredSecret || requiredSecret.trim().length === 0) {
            if (isJson) return res.status(403).json({ error: 'Admin setup via key is disabled on this server.' });
            return res.status(403).send("Admin setup via key is disabled on this server.");
        }

        if (secretKey !== requiredSecret) {
            if (isJson) return res.status(403).json({ error: 'Invalid admin setup key.' });
            return res.status(403).send("Unauthorized key.");
        }

        const userId = req.user?.id || req.session?.user?.id;
        if (!userId) {
            if (isJson) return res.status(401).json({ error: 'Please log in first.' });
            return res.status(401).send("Not logged in!");
        }

        await userModel.makeUserAdmin(userId);

        auditModel.logEvent({
            userId,
            userEmail: req.user?.email || req.session?.user?.email,
            action: 'ROLE_PROMOTION_ADMIN',
            details: { promotedUserId: userId },
            req
        });

        const token = signToken({
            id: userId,
            role: 'admin',
            name: req.user?.name || req.session?.user?.name,
            email: req.user?.email || req.session?.user?.email,
            city: req.user?.city || req.session?.user?.city || 'Kothrud, Pune'
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        if (isJson) return res.json({ success: true, message: 'Promoted to admin successfully!' });
        res.send("<h1>Success! You are now an Admin.</h1><p><a href='/admin.html'>Go to Admin Dashboard</a></p>");
    } catch (err) {
        console.error("MAKE ADMIN ERROR:", err);
        const isJson = req.headers.accept?.includes('application/json');
        if (isJson) return res.status(500).json({ error: 'Error promoting user to admin' });
        res.status(500).send("Error promoting user to admin");
    }
};
