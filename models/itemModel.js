const db = require('../database/db');

let itemSchemaEnsured = false;

async function ensureItemSchema() {
    if (itemSchemaEnsured) return;
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS condition VARCHAR(30)");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS pickup_availability VARCHAR(100)");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
    itemSchemaEnsured = true;
}

exports.getAllItems = async (search, category, condition, includeUnavailable = false, page = null, limit = null) => {
    await ensureItemSchema();
    let params = [];
    let i = 1;

    const hasSearch = Boolean(search && search.trim());
    let rankSelect = '0 AS rank';

    if (hasSearch) {
        rankSelect = `ts_rank_cd(items.search_vector, plainto_tsquery('english', $${i})) AS rank`;
        params.push(search.trim());
        i += 1;
    }

    let sql = `
        SELECT
            items.*,
            users.email AS owner_email,
            ${rankSelect}
        FROM items
        JOIN users ON items.user_id = users.id
        WHERE items.archived_at IS NULL
          AND users.archived_at IS NULL
    `;
    if (!includeUnavailable) sql += " AND items.status = 'available'";

    if (hasSearch) {
        sql += ` AND items.search_vector @@ plainto_tsquery('english', $1)`;
    }

    if (category && category !== 'All') {
        sql += ` AND items.category ILIKE $${i}`;
        params.push(category);
        i += 1;
    }

    if (condition && condition !== 'All') {
        sql += ` AND items.condition ILIKE $${i}`;
        params.push(condition);
        i += 1;
    }

    sql += ' ORDER BY rank DESC, items.id DESC';

    if (page && limit) {
        const offset = (page - 1) * limit;
        sql += ` LIMIT $${i} OFFSET $${i + 1}`;
        params.push(limit, offset);
    }

    const result = await db.query(sql, params);
    return result.rows;
};

exports.getItemsCount = async (search, category, condition, includeUnavailable = false) => {
    await ensureItemSchema();
    let params = [];
    let i = 1;

    let sql = `
        SELECT COUNT(*) AS total
        FROM items
        JOIN users ON items.user_id = users.id
        WHERE items.archived_at IS NULL
          AND users.archived_at IS NULL
    `;
    if (!includeUnavailable) sql += " AND items.status = 'available'";

    if (search && search.trim()) {
        sql += ` AND items.search_vector @@ plainto_tsquery('english', $${i})`;
        params.push(search.trim());
        i += 1;
    }

    if (category && category !== 'All') {
        sql += ` AND items.category ILIKE $${i}`;
        params.push(category);
        i += 1;
    }

    if (condition && condition !== 'All') {
        sql += ` AND items.condition ILIKE $${i}`;
        params.push(condition);
        i += 1;
    }

    const result = await db.query(sql, params);
    return parseInt(result.rows[0].total, 10);
};

exports.getItemsByUser = async (user_id) => {
    await ensureItemSchema();
    const result = await db.query(
        "SELECT * FROM items WHERE user_id=$1 AND archived_at IS NULL ORDER BY id DESC",
        [user_id]
    );
    return result.rows;
};

exports.deleteItem = async (id, user_id) => {
    await ensureItemSchema();
    await db.query(
        "UPDATE requests SET archived_at = CURRENT_TIMESTAMP WHERE item_id=$1 AND archived_at IS NULL",
        [id]
    );
    await db.query(
        "UPDATE items SET archived_at = CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2 AND archived_at IS NULL",
        [id, user_id]
    );
};

exports.deleteItemByAdmin = async (id) => {
    await ensureItemSchema();
    await db.query(
        "UPDATE requests SET archived_at = CURRENT_TIMESTAMP WHERE item_id=$1 AND archived_at IS NULL",
        [id]
    );
    await db.query(
        "UPDATE items SET archived_at = CURRENT_TIMESTAMP WHERE id=$1 AND archived_at IS NULL",
        [id]
    );
};

exports.getItemById = async (id) => {
    await ensureItemSchema();
    const sql = `
        SELECT 
            items.*,
            users.id as donor_id,
            users.name as donor_name,
            users.email as donor_email,
            users.city as donor_city,
            users.avatar_url as donor_avatar,
            users.created_at as donor_joined_at,
            (SELECT COUNT(*) FROM items WHERE user_id = users.id AND archived_at IS NULL) as donor_total_shared,
            (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0) FROM reviews WHERE reviewee_id = users.id) as donor_rating,
            (SELECT COUNT(*) FROM reviews WHERE reviewee_id = users.id) as donor_review_count,
            (SELECT COUNT(*) FROM requests WHERE item_id = items.id AND archived_at IS NULL) as request_count
        FROM items
        JOIN users ON items.user_id = users.id
        WHERE items.id = $1 AND items.archived_at IS NULL AND users.archived_at IS NULL;
    `;
    const result = await db.query(sql, [id]);
    return result.rows[0] || null;
};

exports.updateItem = async (id, userId, fields) => {
    await ensureItemSchema();
    const { title, description, category, condition, location, pickup_availability, weight_category, latitude, longitude } = fields;
    const sql = `
        UPDATE items
        SET 
            title = COALESCE($1, title),
            description = COALESCE($2, description),
            category = COALESCE($3, category),
            condition = COALESCE($4, condition),
            location = COALESCE($5, location),
            pickup_availability = COALESCE($6, pickup_availability),
            weight_category = COALESCE($7, weight_category),
            latitude = COALESCE($8, latitude),
            longitude = COALESCE($9, longitude)
        WHERE id = $10 AND user_id = $11 AND archived_at IS NULL
        RETURNING *;
    `;
    const result = await db.query(sql, [title, description, category, condition, location, pickup_availability, weight_category, latitude ?? null, longitude ?? null, id, userId]);
    return result.rows[0];
};

exports.updateItemStatus = async (id, userId, status) => {
    await ensureItemSchema();
    const isReserved = status === 'reserved';
    const sql = `
        UPDATE items
        SET status = $1, is_reserved = $2
        WHERE id = $3 AND user_id = $4 AND archived_at IS NULL
        RETURNING *;
    `;
    const result = await db.query(sql, [status, isReserved, id, userId]);
    return result.rows[0];
};

exports.saveItem = async (userId, itemId) => {
    await ensureItemSchema();
    const sql = `
        INSERT INTO saved_items (user_id, item_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, item_id) DO NOTHING
        RETURNING *;
    `;
    const result = await db.query(sql, [userId, itemId]);
    return result.rows[0];
};

exports.unsaveItem = async (userId, itemId) => {
    await ensureItemSchema();
    const sql = `
        DELETE FROM saved_items
        WHERE user_id = $1 AND item_id = $2;
    `;
    await db.query(sql, [userId, itemId]);
    return true;
};

exports.getSavedItems = async (userId) => {
    await ensureItemSchema();
    const sql = `
        SELECT 
            items.*,
            users.name as donor_name,
            users.email as donor_email,
            saved_items.created_at as saved_at
        FROM saved_items
        JOIN items ON saved_items.item_id = items.id
        JOIN users ON items.user_id = users.id
        WHERE saved_items.user_id = $1 AND items.archived_at IS NULL AND users.archived_at IS NULL
        ORDER BY saved_items.created_at DESC;
    `;
    const result = await db.query(sql, [userId]);
    return result.rows;
};

exports.getUserSavedItemIds = async (userId) => {
    await ensureItemSchema();
    const sql = `
        SELECT item_id FROM saved_items WHERE user_id = $1;
    `;
    const result = await db.query(sql, [userId]);
    return result.rows.map(r => r.item_id);
};

exports.createItem = async (param1, descArg, locArg, imgArg, userIdArg, catArg, condArg, pickupArg, weightArg, latArg, lngArg) => {
    await ensureItemSchema();
    let title, description, location, image, user_id, category, condition, pickupAvailability, weightCategory, latitude, longitude;

    if (typeof param1 === 'object' && param1 !== null) {
        title = param1.title;
        description = param1.description;
        location = param1.location;
        image = param1.image || param1.image_url;
        user_id = param1.user_id || param1.userId;
        category = param1.category;
        condition = param1.condition;
        pickupAvailability = param1.pickup_availability || param1.pickupAvailability;
        weightCategory = param1.weight_category || param1.weightCategory || 'Light (Easy to carry)';
        latitude = param1.latitude ?? null;
        longitude = param1.longitude ?? null;
    } else {
        title = param1;
        description = descArg;
        location = locArg;
        image = imgArg;
        user_id = userIdArg;
        category = catArg;
        condition = condArg;
        pickupAvailability = pickupArg;
        weightCategory = weightArg || 'Light (Easy to carry)';
        latitude = latArg ?? null;
        longitude = lngArg ?? null;
    }

    const result = await db.query(
        "INSERT INTO items (title, description, location, image, user_id, status, category, condition, pickup_availability, weight_category, latitude, longitude) VALUES ($1, $2, $3, $4, $5, 'available', $6, $7, $8, $9, $10, $11) RETURNING *",
        [title, description, location, image, user_id, category, condition, pickupAvailability, weightCategory, latitude, longitude]
    );
    return result.rows[0];
};

