const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const path = require('path');

// ================= SHOW LOGIN =================
exports.showLogin = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/login.html'));
};

// ================= SHOW REGISTER =================
exports.showRegister = (req, res) => {
    res.sendFile(path.join(__dirname, '../pages/register.html'));
};

// ================= REGISTER =================
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await userModel.createUser(name, email, hashedPassword);
        res.redirect('/login');
    } catch (err) {
        console.log(err);
        res.send("Error registering user");
    }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findUserByEmail(email);

        if (!user) {
            return res.redirect('/login?error=usernotfound');
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.redirect('/login?error=wrongpassword');
        }

        req.session.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        console.log(`User Logged In: ${user.email} | Role: ${user.role}`);
        res.redirect('/?t=' + Date.now());

    } catch (err) {
        console.log(err);
        res.redirect('/login?error=database');
    }
};

// ================= LOGOUT =================
exports.logoutUser = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out");
        }
        res.sendFile(path.join(__dirname, '../pages/logout.html'));
    });
};