const db = require('../database/db');

exports.createUser = async (name, email, password) => {
    const sql = "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *";
    const result = await db.query(sql, [name, email, password]);
    return result.rows[0];
};

exports.findUserByEmail = async (email) => {
    const sql = "SELECT * FROM users WHERE email = $1";
    const result = await db.query(sql, [email]);
    return result.rows[0];
};

exports.getAllUsers = async () => {
    const sql = "SELECT id, name, email, city, role FROM users ORDER BY id DESC";
    const result = await db.query(sql);
    return result.rows;
};

exports.getUserStats = async (user_id) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM items WHERE user_id = $1) as total_shared,
            (SELECT COUNT(*) FROM requests r 
             JOIN items i ON r.item_id = i.id 
             WHERE i.user_id = $2 AND r.status = 'Accepted') as people_helped
    `;
    const result = await db.query(sql, [user_id, user_id]);
    return result.rows;
};

exports.getItemsByUser = async (user_id) => {
    const sql = "SELECT * FROM items WHERE user_id = $1 ORDER BY id DESC";
    const result = await db.query(sql, [user_id]);
    return result.rows;
};