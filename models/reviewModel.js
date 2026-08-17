const db = require('../database/db');

const reviewModel = {
    async createReview({ requestId, reviewerId, revieweeId, rating, comment }) {
        const query = `
            INSERT INTO reviews (request_id, reviewer_id, reviewee_id, rating, comment)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [requestId, reviewerId, revieweeId, rating, comment || null];
        const res = await db.query(query, values);
        return res.rows[0];
    },

    async getReviewsForUser(userId) {
        const query = `
            SELECT r.*, u.name as reviewer_name, u.city as reviewer_city, u.avatar_url as reviewer_avatar
            FROM reviews r
            JOIN users u ON r.reviewer_id = u.id
            WHERE r.reviewee_id = $1
            ORDER BY r.created_at DESC
            LIMIT 20;
        `;
        const res = await db.query(query, [userId]);
        return res.rows;
    },

    async getUserRatingSummary(userId) {
        const query = `
            SELECT 
                COUNT(*) as total_reviews,
                COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0) as average_rating
            FROM reviews
            WHERE reviewee_id = $1;
        `;
        const res = await db.query(query, [userId]);
        const row = res.rows[0];
        return {
            total_reviews: parseInt(row.total_reviews, 10) || 0,
            average_rating: parseFloat(row.average_rating) || 5.0
        };
    },

    async hasUserReviewedRequest(requestId, reviewerId) {
        const query = `
            SELECT id FROM reviews
            WHERE request_id = $1 AND reviewer_id = $2
            LIMIT 1;
        `;
        const res = await db.query(query, [requestId, reviewerId]);
        return res.rows.length > 0;
    }
};

module.exports = reviewModel;
