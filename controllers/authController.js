const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'giving-tree-jwt-secret-2024';

// ================= SHOW LOGIN =================
exports.showLogin = (req, res) => {
    return res.redirect("https://giving-tree-frontend.vercel.app/login.html");
};

exports.showRegister = (req, res) => {
    return res.redirect("https://giving-tree-frontend.vercel.app/register.html");
};

// ================= REGISTER =================
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // ❌ removed duplicate findByEmail
        const existingUser = await userModel.findUserByEmail(email);

        if (existingUser) {
            return res.redirect("https://giving-tree-frontend.vercel.app/register.html?error=userexists");
        }

        await userModel.createUser(name, email, password);

        return res.redirect("https://giving-tree-frontend.vercel.app/login.html");

    } catch (err) {
        console.error(err);
        return res.redirect("https://giving-tree-frontend.vercel.app/register.html?error=servererror");
    }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ❌ removed duplicate findByEmail
        const user = await userModel.findUserByEmail(email);

        if (!user) {
            return res.redirect("https://giving-tree-frontend.vercel.app/login.html?error=usernotfound");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.redirect("https://giving-tree-frontend.vercel.app/login.html?error=wrongpassword");
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            JWT_SECRET
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "none",
            secure: true
        });

        return res.redirect("https://giving-tree-frontend.vercel.app/index.html");

    } catch (err) {
        console.error(err);
        return res.redirect("https://giving-tree-frontend.vercel.app/login.html?error=servererror");
    }
};

// ================= LOGOUT =================
exports.logoutUser = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });

    return res.redirect("https://giving-tree-frontend.vercel.app/login.html");
};