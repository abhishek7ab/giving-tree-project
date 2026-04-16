const db = require('../database/db');


exports.createRequest = (item_id, email, callback) => {

    const sql = "INSERT INTO requests (item_id, requester_email, status) VALUES (?, ?, 'pending')";

    db.query(sql, [item_id, email], callback);

};

// This function gets items YOU requested and joins with the OWNER'S email
exports.getRequestsByRequester = (email, callback) => {
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
        WHERE requests.requester_email = ?`;
    db.query(sql, [email], callback);
};
exports.updateStatus = (id, status, callback) => {
    const sql = "UPDATE requests SET status = ? WHERE id = ?";
    db.query(sql, [status, id], callback);
}; 
// Function for a Borrower to see their own sent requests
exports.getRequestsByRequester = (email, callback) => {
    const sql = `
        SELECT requests.id, requests.status, items.title, items.location, items.image
        FROM requests
        JOIN items ON requests.item_id = items.id
        WHERE requests.requester_email = ?`;
    db.query(sql, [email], callback);
};

