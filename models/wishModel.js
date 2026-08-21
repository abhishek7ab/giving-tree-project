const db = require('../database/db');

/**
 * Community Wish / "Items Wanted" Model
 */

async function createWish({ userId, requesterName, requesterEmail, title, description, category, locality, urgency = 'Normal' }) {
    const result = await db.query(
        `INSERT INTO community_wishes (user_id, requester_name, requester_email, title, description, category, locality, urgency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
         RETURNING *`,
        [userId, requesterName, requesterEmail, title, description || '', category, locality, urgency]
    );
    return result.rows[0];
}

async function getAllWishes({ category, locality, status = 'open', search, limit = 50, offset = 0 } = {}) {
    let query = `
        SELECT w.*, u.avatar_url AS requester_avatar
        FROM community_wishes w
        LEFT JOIN users u ON w.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (status && status !== 'all') {
        query += ` AND w.status = $${paramIdx++}`;
        params.push(status);
    }

    if (category && category !== 'All' && category !== 'all') {
        query += ` AND w.category = $${paramIdx++}`;
        params.push(category);
    }

    if (locality && locality !== 'all' && locality !== 'All Pune') {
        query += ` AND (LOWER(w.locality) LIKE LOWER($${paramIdx}) OR LOWER(w.locality) = LOWER($${paramIdx}))`;
        params.push(`%${locality}%`);
        paramIdx++;
    }

    if (search && search.trim()) {
        query += ` AND (LOWER(w.title) LIKE LOWER($${paramIdx}) OR LOWER(w.description) LIKE LOWER($${paramIdx}))`;
        params.push(`%${search.trim()}%`);
        paramIdx++;
    }

    query += ` ORDER BY 
        CASE 
            WHEN w.urgency = 'Urgent' THEN 1 
            WHEN w.urgency = 'Normal' THEN 2 
            ELSE 3 
        END,
        w.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
}

async function getWishesByUser(userId) {
    const result = await db.query(
        `SELECT * FROM community_wishes
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows;
}

async function getWishById(id) {
    const result = await db.query(
        `SELECT w.*, u.name AS requester_name, u.email AS requester_email
         FROM community_wishes w
         LEFT JOIN users u ON w.user_id = u.id
         WHERE w.id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

async function updateWishStatus(id, userId, status) {
    const result = await db.query(
        `UPDATE community_wishes
         SET status = $1
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [status, id, userId]
    );
    return result.rows[0] || null;
}

async function deleteWish(id, userId) {
    const result = await db.query(
        `DELETE FROM community_wishes
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
    );
    return result.rows[0] || null;
}

async function findMatchingWishesForDonorItem({ category, locality, title = '' }) {
    let query = `
        SELECT w.*, u.name AS requester_name
        FROM community_wishes w
        LEFT JOIN users u ON w.user_id = u.id
        WHERE w.status = 'open'
    `;
    const params = [];
    let paramIdx = 1;

    if (category) {
        query += ` AND w.category = $${paramIdx++}`;
        params.push(category);
    }

    if (locality) {
        query += ` AND (LOWER(w.locality) LIKE LOWER($${paramIdx}) OR LOWER(w.locality) = LOWER($${paramIdx}))`;
        params.push(`%${locality}%`);
        paramIdx++;
    }

    query += ` ORDER BY w.created_at DESC LIMIT 5`;

    const result = await db.query(query, params);
    return result.rows;
}

async function getWishCountByLocality() {
    const result = await db.query(`
        SELECT locality, COUNT(*) as count
        FROM community_wishes
        WHERE status = 'open'
        GROUP BY locality
    `);
    const map = {};
    for (const row of result.rows) {
        map[row.locality] = parseInt(row.count, 10);
    }
    return map;
}

module.exports = {
    createWish,
    getAllWishes,
    getWishesByUser,
    getWishById,
    updateWishStatus,
    deleteWish,
    findMatchingWishesForDonorItem,
    getWishCountByLocality,
};
