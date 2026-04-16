// This function checks if a user is logged in
exports.isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        // User is logged in, proceed to the next function
        return next();
    }
    // User is not logged in, redirect to login page
    res.redirect('/login');
};

// This function checks if the user is an admin
exports.isAdmin = (req, res, next) => {
    console.log("--- ADMIN CHECK ---");
    console.log("Session Data:", req.session.user);
    
    if (req.session.user && req.session.user.role === 'admin') {
        console.log("Access Granted!");
        return next();
    }
    
    console.log("Access Denied. Role found:", req.session.user ? req.session.user.role : "None");
    res.status(403).send("<h1>403 Access Denied</h1>");
};