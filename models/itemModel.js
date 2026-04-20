const db = require('../database/db');

exports.createItem = async (title, description, location, image, user_id) => {
    const sql = "INSERT INTO items (title, description, location, image, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const result = await db.query(sql, [title, description, location, image, user_id]);
    return result.rows[0];
};

exports.getAllItems = async (search, category) => {
    let sql = "SELECT * FROM items WHERE 1=1";
    let params = [];
    let i = 1;

    if (search) {
        sql += ` AND (title ILIKE $${i} OR description ILIKE $${i+1})`;
        params.push(`%${search}%`, `%${search}%`);
        i += 2;
    }

    if (category && category !== 'All') {
        sql += ` AND category = $${i}`;
        params.push(category);
        i++;
    }

    const result = await db.query(sql, params);
    return result.rows;
};

exports.deleteItem = async (id, user_id) => {
    const sql = "DELETE FROM items WHERE id = $1 AND user_id = $2";
    const result = await db.query(sql, [id, user_id]);
    return result.rowCount;
};