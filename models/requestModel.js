const db = require('../database/db');

exports.createRequest = async (item_id, email) => {
    const sql = "INSERT INTO requests (item_id, requester_email, status) VALUES ($1, $2, 'pending') RETURNING *";
    const result = await db.query(sql, [item_id, email]);
    return result.rows[0];
};

exports.getRequests = async () => {
    const sql = `
        SELECT 
            requests.id,
            requests.status,
            requests.requester_email,
            items.title,
            items.location,
            items.image,
            users.email as owner_email
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
    `;
    const result = await db.query(sql);
    return result.rows;
};

exports.getRequestsByRequester = async (email) => {
    const sql = `
        SELECT 
            requests.id,
            requests.status,
            items.title,
            items.location,
            items.image,
            users.email as owner_email
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        WHERE requests.requester_email = $1
    `;
    const result = await db.query(sql, [email]);
    return result.rows;
};

exports.updateStatus = async (id, status) => {
    const sql = "UPDATE requests SET status = $1 WHERE id = $2";
    const result = await db.query(sql, [status, id]);
    return result.rowCount;
};