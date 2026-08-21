const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { signToken, verifyToken } = require('../config/jwt');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const adminNotifier = require('../utils/adminNotifier');

const isProduction = process.env.NODE_ENV === 'production';

const { ALLOWED_PUNE_LOCATIONS } = require('../middleware/validation');

// Authentic Email Validator (RFC 5322 & Recognized TLD Structure)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function isValidAuthenticEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const clean = email.trim().toLowerCase();
    if (clean.length < 6 || clean.length > 254) return false;
    if (!EMAIL_REGEX.test(clean)) return false;
    
    const parts = clean.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    
    if (local.length < 1 || local.length > 64) return false;
    if (!domain.includes('.')) return false;
    
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return false;
    
    return true;
}

exports.isValidAuthenticEmail = isValidAuthenticEmail;

// ================= GENERATE CAPTCHA =================
exports.generateCaptcha = (req, res) => {
    try {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Clean characters avoiding ambiguous 0/O/1/I
        let text = '';
        for (let i = 0; i < 5; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const secret = process.env.JWT_SECRET || 'giving-tree-secret-key-2026';
        const timestamp = Date.now();
        const hash = crypto.createHmac('sha256', secret).update(`${text.toUpperCase()}:${timestamp}`).digest('hex');
        const token = `${timestamp}.${hash}`;

        const colors = ['#10b981', '#34d399', '#38bdf8', '#fbbf24', '#f43f5e'];
        let charElements = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const rot = Math.floor(Math.random() * 24) - 12;
            const yOffset = 25 + Math.floor(Math.random() * 6) - 3;
            const color = colors[i % colors.length];
            const x = 16 + i * 28;
            charElements += `<text x="${x}" y="${yOffset}" fill="${color}" font-size="21" font-weight="900" font-family="'Courier New', monospace" transform="rotate(${rot}, ${x}, ${yOffset})">${char}</text>`;
        }

        const noiseLine1 = `<path d="M 4 ${Math.random() * 25 + 5} Q ${Math.random() * 60 + 30} ${Math.random() * 30 + 4} 156 ${Math.random() * 25 + 5}" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" fill="none"/>`;
        const noiseLine2 = `<path d="M 4 ${Math.random() * 25 + 5} Q ${Math.random() * 60 + 50} ${Math.random() * 30 + 4} 156 ${Math.random() * 25 + 5}" stroke="rgba(16,185,129,0.35)" stroke-width="1.5" fill="none"/>`;

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="36" viewBox="0 0 160 36" style="border-radius:6px; background:#060911;"><rect width="100%" height="100%" fill="#060911"/>${noiseLine1}${noiseLine2}${charElements}</svg>`.trim();

        return res.json({
            success: true,
            captchaToken: token,
            svg: svg
        });
    } catch (err) {
        console.error('CAPTCHA GENERATION ERROR:', err);
        return res.status(500).json({ error: 'Failed to generate captcha' });
    }
};

function verifyCaptchaToken(userInput, token) {
    if (!token || !userInput) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [timestampStr, hash] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Expire after 15 minutes
    if (isNaN(timestamp) || Date.now() - timestamp > 15 * 60 * 1000) {
        return false;
    }

    const secret = process.env.JWT_SECRET || 'giving-tree-secret-key-2026';
    const cleanInput = String(userInput).trim().toUpperCase();
    const expectedHash = crypto.createHmac('sha256', secret).update(`${cleanInput}:${timestamp}`).digest('hex');
    
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
    } catch (e) {
        return false;
    }
}

exports.verifyCaptchaToken = verifyCaptchaToken;

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
            if (isJson) return res.status(400).json({ error: 'locationinvalid', message: 'Location must be one of the supported Pune neighborhood locations.' });
            return res.redirect("/register.html?error=locationinvalid");
        }

        if (!email || !password) {
            if (isJson) return res.status(400).json({ error: 'missingfields', message: 'Please complete all required fields.' });
            return res.redirect("/register.html?error=missingfields");
        }

        if (!isValidAuthenticEmail(email)) {
            if (isJson) return res.status(400).json({ error: 'emailinvalid', message: 'Please enter a valid, authentic email address (e.g. yourname@gmail.com).' });
            return res.redirect("/register.html?error=emailinvalid");
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

        // Notify platform admin of new neighbor registration
        await adminNotifier.notifyAdmin({
            type: 'admin_user_joined',
            title: 'New Neighbor Joined Giving Tree',
            body: `${rawName} (${email}) joined the platform from ${rawCity}.`,
            userEmail: email,
            req
        });

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
const DUMMY_HASH = '$2b$10$e8w3JqVn8nN1M9Lw7P6Qqe.yPjB0Z5vLqB3uF5yH6yP9yP9yP9yP9';

exports.loginUser = async (req, res) => {
    try {
        const { password, captcha, captcha_token } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        const isJson = req.headers.accept?.includes('application/json');

        if (!isValidAuthenticEmail(email)) {
            if (isJson) return res.status(400).json({ error: 'emailinvalid', message: 'Please enter a valid, authentic email address (e.g. yourname@gmail.com).' });
            return res.redirect("/login.html?error=emailinvalid");
        }

        // Real-person Human Verification (Security CAPTCHA)
        if (captcha_token && captcha) {
            const isCaptchaValid = verifyCaptchaToken(captcha, captcha_token);
            if (!isCaptchaValid) {
                if (isJson) return res.status(400).json({ error: 'captchainvalid', message: 'CAPTCHA code is incorrect or expired. Please verify you are a real person.' });
                return res.redirect("/login.html?error=captchainvalid");
            }
        } else if (process.env.NODE_ENV !== 'test' && captcha_token && !captcha) {
            if (isJson) return res.status(400).json({ error: 'captcharequired', message: 'Please complete the CAPTCHA to verify you are a real person.' });
            return res.redirect("/login.html?error=captcharequired");
        }

        const user = await userModel.findUserByEmail(email);

        if (!user) {
            // Timing attack equalization: execute constant-time bcrypt compare
            await bcrypt.compare(password || '', DUMMY_HASH).catch(() => {});
            if (isJson) return res.status(400).json({ error: 'usernotfound', message: 'Your password or Gmail is incorrect. Please log in with correct credentials.' });
            return res.redirect("/login.html?error=usernotfound");
        }

        // Check if account is temporarily locked due to brute force attempts
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remainingMins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000));
            const lockMsg = `Account temporarily locked due to multiple failed attempts. Please try again in ${remainingMins} minute(s).`;
            if (isJson) return res.status(429).json({ error: 'account_locked', message: lockMsg });
            return res.redirect(`/login.html?error=account_locked`);
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // Increment failed login attempts
            const db = require('../database/db');
            const attempts = (user.failed_login_attempts || 0) + 1;
            let lockedUntil = null;
            if (attempts >= 5) {
                lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
            }
            await db.query(
                'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
                [attempts, lockedUntil, user.id]
            ).catch(err => console.error("Failed attempts update error:", err));

            if (isJson) return res.status(400).json({ error: 'wrongpassword', message: 'Your password or Gmail is incorrect. Please log in with correct credentials.' });
            return res.redirect("/login.html?error=wrongpassword");
        }

        // On successful authentication, reset failed attempts & lockout
        if ((user.failed_login_attempts && user.failed_login_attempts > 0) || user.locked_until) {
            const db = require('../database/db');
            await db.query(
                'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
                [user.id]
            ).catch(err => console.error("Reset attempts error:", err));
        }

        // Notify platform admin of user login
        await adminNotifier.notifyAdmin({
            type: 'admin_user_login',
            title: 'Neighbor Logged In',
            body: `${user.name || user.email} (${user.email}) signed in from ${user.city || 'Pune'}.`,
            userId: user.id,
            userEmail: user.email,
            req
        });

        const userRole = user.role || 'user';
        const redirectUrl = (userRole === 'admin' || user.email === 'badaveabhishek2004@gmail.com') ? '/admin.html' : '/index.html';

        const token = signToken(
            { id: user.id, role: userRole, name: user.name, email: user.email, city: user.city || 'Kothrud, Pune', tokenVersion: user.token_version || 1 }
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
            return res.status(400).json({ error: 'Location must be one of the supported Pune neighborhood locations.' });
        }

        const updatedUser = await userModel.updateUserProfile(userId, { name: newName, city: newCity });

        const token = signToken({
            id: updatedUser.id,
            role: updatedUser.role,
            name: updatedUser.name,
            email: updatedUser.email,
            city: updatedUser.city,
            tokenVersion: updatedUser.token_version || req.user?.tokenVersion || 1
        });
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
        const secretKey = req.body?.key;
        const requiredSecret = process.env.ADMIN_SETUP_KEY;

        if (!requiredSecret || requiredSecret.trim().length === 0) {
            if (isJson) return res.status(403).json({ error: 'Admin setup via key is disabled on this server.' });
            return res.status(403).send("Admin setup via key is disabled on this server.");
        }

        // Constant-time key verification to eliminate timing attack vectors
        const keyBuf = Buffer.from(String(secretKey || ''));
        const reqBuf = Buffer.from(String(requiredSecret));
        if (keyBuf.length !== reqBuf.length || !crypto.timingSafeEqual(keyBuf, reqBuf)) {
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

        const db = require('../database/db');
        const userRes = await db.query('SELECT token_version FROM users WHERE id = $1', [userId]);
        const currentTokenVer = userRes.rows[0]?.token_version || 1;

        const token = signToken({
            id: userId,
            role: 'admin',
            name: req.user?.name || req.session?.user?.name,
            email: req.user?.email || req.session?.user?.email,
            city: req.user?.city || req.session?.user?.city || 'Kothrud, Pune',
            tokenVersion: currentTokenVer
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

// ================= CHANGE PASSWORD (WITH TOKEN VERSION REVOCATION) =================
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.user?.id;
        const isJson = req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json');

        if (!userId) {
            if (isJson) return res.status(401).json({ error: 'Not logged in' });
            return res.status(401).send("Not logged in");
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            if (isJson) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            return res.status(400).send("Password must be at least 6 characters.");
        }

        const db = require('../database/db');
        const userRes = await db.query('SELECT id, email, password, token_version, role, name, city FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        if (!user) {
            if (isJson) return res.status(404).json({ error: 'User not found' });
            return res.status(404).send("User not found");
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            if (isJson) return res.status(400).json({ error: 'Incorrect current password.' });
            return res.status(400).send("Incorrect current password.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const nextTokenVersion = (user.token_version || 1) + 1;

        await db.query(
            'UPDATE users SET password = $1, token_version = $2, failed_login_attempts = 0, locked_until = NULL WHERE id = $3',
            [hashedPassword, nextTokenVersion, userId]
        );

        auditModel.logEvent({
            userId,
            userEmail: user.email,
            action: 'PASSWORD_CHANGE',
            details: { tokenVersion: nextTokenVersion },
            req
        });

        // Issue fresh JWT with updated tokenVersion
        const token = signToken({
            id: user.id,
            role: user.role || 'user',
            name: user.name,
            email: user.email,
            city: user.city || 'Kothrud, Pune',
            tokenVersion: nextTokenVersion
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
            domain: process.env.COOKIE_DOMAIN || undefined,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        if (isJson) return res.json({ success: true, message: 'Password changed successfully!' });
        return res.send("Password changed successfully!");

    } catch (err) {
        console.error("CHANGE PASSWORD ERROR:", err);
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ error: 'Failed to update password.' });
        }
        return res.status(500).send("Failed to update password.");
    }
};
