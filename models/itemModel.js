const db = require('../database/db');

exports.getAllItems = async (search, category) => {
    let sql = "SELECT * FROM items WHERE 1=1";
    let params = [];
    let i = 1;

    if (search) {
        sql += ` AND (title ILIKE $${i} OR description ILIKE $${i + 1})`;
        params.push(`%${search}%`, `%${search}%`);
        i += 2;
    }

    if (category && category !== 'All') {
        sql += ` AND category = $${i}`;
        params.push(category);
    }

    const result = await db.query(sql, params);
    return result.rows;
};

exports.getItemsByUser = async (user_id) => {
    const result = await db.query(
        "SELECT * FROM items WHERE user_id=$1 ORDER BY id DESC",
        [user_id]
    );
    return result.rows;
};

exports.deleteItem = async (id, user_id) => {
    await db.query(
        "DELETE FROM items WHERE id=$1 AND user_id=$2",
        [id, user_id]
    );
};