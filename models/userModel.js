const db = require('../database/db');

exports.createUser = (name, email, password, callback) => {

    const sql = "INSERT INTO users (name,email,password) VALUES (?,?,?)";

    db.query(sql, [name, email, password], callback);

};

exports.findUserByEmail = (email, callback) => {

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], callback);

};
// Add this to the bottom of models/userModel.js
exports.getAllUsers = (callback) => {
    // We added 'city' in Step 1, so this query will now work
    const sql = "SELECT id, name, email, city, role FROM users ORDER BY id DESC";
    db.query(sql, callback);
};
exports.getUserStats = (user_id, callback) => {
    // This query gets: 
    // 1. Total items shared by user
    // 2. Total requests they have 'Accepted' (People helped)
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM items WHERE user_id = ?) as total_shared,
            (SELECT COUNT(*) FROM requests r JOIN items i ON r.item_id = i.id 
             WHERE i.user_id = ? AND r.status = 'Accepted') as people_helped
    `;
    db.query(sql, [user_id, user_id], callback);
};