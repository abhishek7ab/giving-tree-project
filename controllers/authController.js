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

        userModel.createUser(name, email, hashedPassword, (err) => {

            if (err) {
                console.log(err);
                return res.send("Error registering user");
            }

            res.redirect('/login');
        });

    } catch (error) {
        console.log(error);
        res.send("Error hashing password");
    }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {

    const { email, password } = req.body;

    userModel.findUserByEmail(email, async (err, results) => {

        if (err) {
            // Redirect with database error flag
            return res.redirect('/login?error=database');
        }

        if (results.length === 0) {
            // Redirect with user not found flag
            return res.redirect('/login?error=usernotfound');
        }

        const user = results[0];

        try {
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                // ✅ PINPOINT CHANGE: Redirect back to login with a flag instead of showing raw text
                return res.redirect('/login?error=wrongpassword');
            }

            // ✅ STRUCTURE PRESERVED: Role, Name, and Email all saved to session
// Inside the bcrypt.compare check:
        req.session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role // <--- THIS LINE IS THE MOST IMPORTANT
        };

            console.log(`User Logged In: ${user.email} | Role: ${user.role}`);

            res.redirect('/?t=' + Date.now());
        } catch (error) {
            console.log(error);
            // Redirect with general error flag
            res.redirect('/login?error=servererror');
        }
    });
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