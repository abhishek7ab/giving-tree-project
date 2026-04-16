const db = require('../database/db');

exports.createItem = (title, description, location, image, user_id, callback) => {
    const sql = "INSERT INTO items (title, description, location, image, user_id) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [title, description, location, image, user_id], callback);
};

// Updated: Now accepts optional filter parameters
exports.getAllItems = (search, category, callback) => {
    let sql = "SELECT * FROM items WHERE 1=1";
    let params = [];

    if (search) {
        sql += " AND (title LIKE ? OR description LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'All') {
        sql += " AND category = ?";
        params.push(category);
    }

    db.query(sql, params, callback);
};

exports.getAllItems = (search, category, callback) => {
    // If you don't have the search/category logic yet, use this simple one:
    const sql = "SELECT * FROM items";
    db.query(sql, callback);
};

exports.deleteItem = (id, user_id, callback) => {
    const sql = "DELETE FROM items WHERE id = ? AND user_id = ?";
    db.query(sql, [id, user_id], callback);
}