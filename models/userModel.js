const db = require('../database/db');
const bcrypt = require('bcrypt');

const PUNE_LOCALITY_COORDS = {
    'Kothrud, Pune': { lat: 18.5074, lng: 73.8077 },
    'Baner, Pune': { lat: 18.5590, lng: 73.7868 },
    'FC Road, Pune': { lat: 18.5284, lng: 73.8417 },
    'Hinjawadi, Pune': { lat: 18.5913, lng: 73.7389 },
    'Viman Nagar, Pune': { lat: 18.5679, lng: 73.9143 },
    'Koregaon Park, Pune': { lat: 18.5362, lng: 73.8940 },
    'Hadapsar, Pune': { lat: 18.5089, lng: 73.9259 },
    'Katraj, Pune': { lat: 18.4575, lng: 73.8677 }
};

let userColumnsChecked = false;

async function ensureUserColumns() {
    if (userColumnsChecked) return;
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(10)");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
    userColumnsChecked = true;
}

exports.findUserByName = async (name, includeArchived = false, excludeUserId = null) => {
    try {
        if (!name || typeof name !== 'string') return null;
        let query = includeArchived
            ? "SELECT * FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))"
            : "SELECT * FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND archived_at IS NULL";
        const params = [name.trim()];
        if (excludeUserId) {
            query += " AND id != $2";
            params.push(excludeUserId);
        }
        const result = await db.query(query, params);
        return result.rows[0];
    } catch(e) {
        console.error("DB FIND USER BY NAME ERROR:", e.message);
        throw e;
    }
};

exports.createUser = async (name, email, password, phone, city = 'Kothrud, Pune', latitude = null, longitude = null) => {
    try {
        await ensureUserColumns();
        const trimmedName = String(name || '').trim();
        const trimmedEmail = String(email || '').trim().toLowerCase();

        if (!trimmedName) {
            const err = new Error('Username / Name is compulsory.');
            err.code = 'NAME_REQUIRED';
            throw err;
        }

        // Enforce unique name among active users
        const nameExisting = await exports.findUserByName(trimmedName);
        if (nameExisting && nameExisting.email.toLowerCase() !== trimmedEmail) {
            const err = new Error('This username/name is already taken. Please choose another.');
            err.code = 'NAME_EXISTS';
            throw err;
        }

        const resolvedCity = city && PUNE_LOCALITY_COORDS[city] ? city : 'Kothrud, Pune';
        const coords = PUNE_LOCALITY_COORDS[resolvedCity] || { lat: 18.5074, lng: 73.8077 };
        const finalLat = latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : coords.lat;
        const finalLng = longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : coords.lng;

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // If this email was previously in the DB (e.g. archived), reactivate and update credentials
        const existing = await exports.findUserByEmail(trimmedEmail, true);
        if (existing) {
            const result = await db.query(
                "UPDATE users SET name = $1, password = $2, phone = $3, city = $4, latitude = $5, longitude = $6, archived_at = NULL WHERE id = $7 RETURNING *",
                [trimmedName, hashedPassword, phone, resolvedCity, finalLat, finalLng, existing.id]
            );
            return result.rows[0];
        }

        const result = await db.query(
            "INSERT INTO users (name, email, password, phone, city, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
            [trimmedName, trimmedEmail, hashedPassword, phone, resolvedCity, finalLat, finalLng]
        );
        return result.rows[0];
    } catch(e) {
        console.error("DB CREATE USER ERROR:", e.message);
        throw e;
    }
};

exports.findUserByEmail = async (email, includeArchived = false) => {
    try {
        const query = includeArchived
            ? "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))"
            : "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND archived_at IS NULL";
        const result = await db.query(query, [email]);
        return result.rows[0];
    } catch(e) {
        console.error("DB FIND USER ERROR:", e.message);
        throw e;
    }
};

exports.getAllUsers = async () => {
    const result = await db.query(
        "SELECT id,name,email,phone,city,role FROM users WHERE archived_at IS NULL ORDER BY id DESC"
    );
    return result.rows;
};

exports.makeUserAdmin = async (id) => {
    await db.query("UPDATE users SET role='admin' WHERE id=$1", [id]);
};

exports.getUserStats = async (user_id) => {
    const itemsResult = await db.query("SELECT COUNT(*) FROM items WHERE user_id=$1 AND archived_at IS NULL", [user_id]);
    const itemsShared = parseInt(itemsResult.rows[0].count, 10);

    const helpedResult = await db.query(
        "SELECT COUNT(*) FROM requests r JOIN items i ON r.item_id = i.id WHERE i.user_id=$1 AND i.archived_at IS NULL AND r.archived_at IS NULL AND r.status ILIKE 'accepted'",
        [user_id]
    );
    const peopleHelped = parseInt(helpedResult.rows[0].count, 10);

    return [{ total_shared: itemsShared, people_helped: peopleHelped }];
};

exports.deleteUserById = async (id) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const userResult = await client.query(
            "SELECT id, email, role FROM users WHERE id=$1 AND archived_at IS NULL",
            [id]
        );
        const user = userResult.rows[0];
        if (!user || user.role === 'admin') {
            await client.query('ROLLBACK');
            return 0;
        }

        // Archive requests made by this user.
        await client.query(
            "UPDATE requests SET archived_at = CURRENT_TIMESTAMP WHERE requester_email = $1 AND archived_at IS NULL",
            [user.email]
        );

        // Archive requests made on this user's posted items.
        await client.query(
            "UPDATE requests SET archived_at = CURRENT_TIMESTAMP WHERE item_id IN (SELECT id FROM items WHERE user_id = $1) AND archived_at IS NULL",
            [id]
        );

        // Archive this user's posted items.
        await client.query(
            "UPDATE items SET archived_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND archived_at IS NULL",
            [id]
        );

        // Finally archive the user account.
        const deleteUserResult = await client.query(
            "UPDATE users SET archived_at = CURRENT_TIMESTAMP WHERE id=$1 AND archived_at IS NULL",
            [id]
        );

        await client.query('COMMIT');
        return deleteUserResult.rowCount;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

exports.getPublicUserProfile = async (userId) => {
    const userRes = await db.query(
        "SELECT id, name, city, bio, avatar_url, verified, created_at FROM users WHERE id = $1 AND archived_at IS NULL",
        [userId]
    );
    if (!userRes.rows.length) return null;
    const user = userRes.rows[0];

    const sharedRes = await db.query(
        "SELECT COUNT(*) as count FROM items WHERE user_id = $1 AND archived_at IS NULL",
        [userId]
    );
    const itemsShared = parseInt(sharedRes.rows[0].count, 10) || 0;

    const givenRes = await db.query(
        "SELECT COUNT(*) as count FROM requests r JOIN items i ON r.item_id = i.id WHERE i.user_id = $1 AND r.status ILIKE 'completed' AND r.archived_at IS NULL AND i.archived_at IS NULL",
        [userId]
    );
    const itemsGiven = parseInt(givenRes.rows[0].count, 10) || 0;

    const reviewStatsRes = await db.query(
        "SELECT COUNT(*) as total_reviews, COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0) as average_rating FROM reviews WHERE reviewee_id = $1",
        [userId]
    );
    const totalReviews = parseInt(reviewStatsRes.rows[0].total_reviews, 10) || 0;
    const averageRating = parseFloat(reviewStatsRes.rows[0].average_rating) || 5.0;

    const recentReviewsRes = await db.query(
        `SELECT r.*, u.name as reviewer_name, u.city as reviewer_city 
         FROM reviews r 
         JOIN users u ON r.reviewer_id = u.id 
         WHERE r.reviewee_id = $1 
         ORDER BY r.created_at DESC LIMIT 5`,
        [userId]
    );

    // Calculate dynamic karma badges
    const badges = [];
    badges.push({ name: '🌿 Community Neighbor', icon: 'fa-seedling', desc: 'Member of the sharing community' });
    if (itemsShared >= 5) badges.push({ name: '🏆 Master Giver', icon: 'fa-trophy', desc: 'Shared 5+ items with neighbors' });
    else if (itemsShared >= 1) badges.push({ name: '🌱 Active Donor', icon: 'fa-hand-holding-heart', desc: 'Actively sharing items' });
    
    if (itemsGiven >= 3) badges.push({ name: '🤝 Reliable Handover', icon: 'fa-handshake', desc: '3+ successful verified handovers' });
    if (averageRating >= 4.8 && totalReviews >= 2) badges.push({ name: '⭐ Top Rated Neighbor', icon: 'fa-star', desc: 'Consistently 5-star feedback' });

    return {
        id: user.id,
        name: user.name,
        city: user.city || 'Neighborhood',
        bio: user.bio || 'Passionate about zero-waste and helping local neighbors!',
        avatar_url: user.avatar_url || null,
        joined_at: user.created_at,
        stats: {
            items_shared: itemsShared,
            items_given: itemsGiven,
            average_rating: averageRating,
            total_reviews: totalReviews
        },
        badges,
        recent_reviews: recentReviewsRes.rows
    };
};

exports.updateUserProfile = async (userId, { name, city, latitude, longitude }) => {
    try {
        await ensureUserColumns();
        const userRes = await db.query("SELECT * FROM users WHERE id = $1 AND archived_at IS NULL", [userId]);
        const user = userRes.rows[0];
        if (!user) throw new Error('User not found');

        let newName = user.name;
        if (name && typeof name === 'string') {
            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                const err = new Error('Name must be at least 2 characters');
                err.code = 'NAME_INVALID';
                throw err;
            }
            const existingNameUser = await exports.findUserByName(trimmedName, false, userId);
            if (existingNameUser) {
                const err = new Error('This username/name is already taken. Please choose another.');
                err.code = 'NAME_EXISTS';
                throw err;
            }
            newName = trimmedName;
        }

        let newCity = user.city || 'Kothrud, Pune';
        let newLat = user.latitude;
        let newLng = user.longitude;

        if (city && typeof city === 'string') {
            const trimmedCity = city.trim();
            if (PUNE_LOCALITY_COORDS[trimmedCity]) {
                newCity = trimmedCity;
                newLat = PUNE_LOCALITY_COORDS[trimmedCity].lat;
                newLng = PUNE_LOCALITY_COORDS[trimmedCity].lng;
            }
        }

        if (latitude != null && !isNaN(Number(latitude))) newLat = Number(latitude);
        if (longitude != null && !isNaN(Number(longitude))) newLng = Number(longitude);

        const updated = await db.query(
            "UPDATE users SET name = $1, city = $2, latitude = $3, longitude = $4 WHERE id = $5 RETURNING *",
            [newName, newCity, newLat, newLng, userId]
        );
        return updated.rows[0];
    } catch(e) {
        console.error("DB UPDATE USER PROFILE ERROR:", e.message);
        throw e;
    }
};

exports.PUNE_LOCALITY_COORDS = PUNE_LOCALITY_COORDS;