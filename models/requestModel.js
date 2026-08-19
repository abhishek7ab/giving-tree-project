const db = require('../database/db');

let requestSchemaEnsured = false;

async function ensureRequestSchema() {
    if (requestSchemaEnsured) return;
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_location TEXT");
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_latitude DOUBLE PRECISION");
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_longitude DOUBLE PRECISION");
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS delivery_instructions TEXT");
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS handover_pin VARCHAR(10)");
    await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION");
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION");
    await db.query(`
        CREATE TABLE IF NOT EXISTS request_messages (
            id SERIAL PRIMARY KEY,
            request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
            sender_email VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS request_message_reads (
            request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
            user_email VARCHAR(255) NOT NULL,
            last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (request_id, user_email)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            type VARCHAR(64) NOT NULL,
            title VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            request_id INTEGER,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    requestSchemaEnsured = true;
}

exports.createRequest = async (item_id, requester, requesterLocation, requesterLatitude = null, requesterLongitude = null, deliveryInstructions = null) => {
    await ensureRequestSchema();

    const requesterId = Number(requester?.id);
    const requesterEmail = String(requester?.email || '').trim().toLowerCase();
    const cleanRequesterLocation = String(requesterLocation || '').trim();
    const cleanInstructions = deliveryInstructions ? String(deliveryInstructions).trim() : null;
    const reqLat = requesterLatitude !== undefined && requesterLatitude !== null && !isNaN(Number(requesterLatitude)) ? Number(requesterLatitude) : null;
    const reqLng = requesterLongitude !== undefined && requesterLongitude !== null && !isNaN(Number(requesterLongitude)) ? Number(requesterLongitude) : null;

    if (!requesterId || !requesterEmail) {
        const err = new Error("Invalid requester information.");
        err.statusCode = 400;
        throw err;
    }

    const ownerCheck = await db.query(
        `
        SELECT items.user_id, users.email AS owner_email
        FROM items
        JOIN users ON items.user_id = users.id
        WHERE items.id = $1
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
        `,
        [item_id]
    );

    if (ownerCheck.rows.length === 0) {
        const err = new Error("Item not found.");
        err.statusCode = 404;
        throw err;
    }

    if (Number(ownerCheck.rows[0].user_id) === requesterId) {
        const err = new Error("You cannot request your own item.");
        err.statusCode = 400;
        throw err;
    }

    if (!cleanRequesterLocation) {
        const err = new Error("Please provide your location before requesting.");
        err.statusCode = 400;
        throw err;
    }

    const duplicateCheck = await db.query(
        `
        SELECT id
        FROM requests
        WHERE item_id = $1
          AND requester_email = $2
          AND archived_at IS NULL
          AND LOWER(status) <> 'rejected'
        LIMIT 1
        `,
        [item_id, requesterEmail]
    );
    if (duplicateCheck.rows.length > 0) {
        const err = new Error("You already have an active request for this item.");
        err.statusCode = 400;
        throw err;
    }

    const sql = `
        INSERT INTO requests (item_id, requester_email, requester_location, requester_latitude, requester_longitude, delivery_instructions, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
    `;
    const result = await db.query(sql, [item_id, requesterEmail, cleanRequesterLocation, reqLat, reqLng, cleanInstructions]);
    return result.rows[0];
};

exports.getRequests = async () => {
    await ensureRequestSchema();
    const sql = `
        SELECT
            requests.id,
            requests.item_id,
            requests.status,
            requests.handover_pin,
            requests.requester_email,
            requests.requester_location,
            requests.requester_latitude,
            requests.requester_longitude,
            requests.delivery_instructions,
            items.title,
            items.location,
            items.latitude AS item_latitude,
            items.longitude AS item_longitude,
            items.image,
            users.id as owner_id,
            users.email as owner_email,
            requester.id AS requester_user_id,
            requester.name AS requester_name,
            requester.phone AS requester_phone,
            0::INTEGER AS unread_count
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        LEFT JOIN users requester ON LOWER(TRIM(requests.requester_email)) = LOWER(TRIM(requester.email))
        WHERE requests.archived_at IS NULL
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
    `;
    const result = await db.query(sql);
    return result.rows;
};

exports.getRequestsForOwner = async (ownerEmail) => {
    await ensureRequestSchema();
    const sql = `
        SELECT
            requests.id,
            requests.item_id,
            requests.status,
            requests.handover_pin,
            requests.requester_email,
            requests.requester_location,
            requests.requester_latitude,
            requests.requester_longitude,
            requests.delivery_instructions,
            items.title,
            items.location,
            items.latitude AS item_latitude,
            items.longitude AS item_longitude,
            items.image,
            users.id as owner_id,
            users.email as owner_email,
            requester.id AS requester_user_id,
            requester.name AS requester_name,
            requester.phone AS requester_phone,
            (
                SELECT COUNT(*)
                FROM reviews
                WHERE request_id = requests.id
                  AND reviewer_id = users.id
            )::INTEGER > 0 AS has_reviewed,
            (
                SELECT COUNT(*)
                FROM request_messages rm
                LEFT JOIN request_message_reads rr
                    ON rr.request_id = requests.id
                   AND LOWER(TRIM(rr.user_email)) = LOWER(TRIM($1))
                WHERE rm.request_id = requests.id
                  AND LOWER(TRIM(rm.sender_email)) <> LOWER(TRIM($1))
                  AND rm.created_at > COALESCE(rr.last_read_at, '1970-01-01'::timestamp)
            )::INTEGER AS unread_count
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        LEFT JOIN users requester ON LOWER(TRIM(requests.requester_email)) = LOWER(TRIM(requester.email))
        WHERE LOWER(TRIM(users.email)) = LOWER(TRIM($1))
          AND requests.archived_at IS NULL
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
    `;
    const result = await db.query(sql, [ownerEmail]);
    return result.rows;
};

exports.getRequestsByRequester = async (email) => {
    await ensureRequestSchema();
    const sql = `
        SELECT 
            requests.id,
            requests.item_id,
            requests.status,
            requests.handover_pin,
            requests.requester_location,
            requests.requester_latitude,
            requests.requester_longitude,
            requests.delivery_instructions,
            items.title,
            items.location,
            items.latitude AS item_latitude,
            items.longitude AS item_longitude,
            items.image,
            users.id as owner_id,
            users.name as owner_name,
            users.email as owner_email,
            (
                SELECT COUNT(*)
                FROM reviews
                WHERE request_id = requests.id
                  AND reviewer_id = (SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1)
            )::INTEGER > 0 AS has_reviewed,
            (
                SELECT COUNT(*)
                FROM request_messages rm
                LEFT JOIN request_message_reads rr
                    ON rr.request_id = requests.id
                   AND LOWER(TRIM(rr.user_email)) = LOWER(TRIM($1))
                WHERE rm.request_id = requests.id
                  AND LOWER(TRIM(rm.sender_email)) <> LOWER(TRIM($1))
                  AND rm.created_at > COALESCE(rr.last_read_at, '1970-01-01'::timestamp)
            )::INTEGER AS unread_count
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        WHERE LOWER(TRIM(requests.requester_email)) = LOWER(TRIM($1))
          AND requests.archived_at IS NULL
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
    `;
    const result = await db.query(sql, [email]);
    return result.rows;
};

exports.setHandoverPin = async (id, pin) => {
    await ensureRequestSchema();
    const sql = `UPDATE requests SET handover_pin = $1 WHERE id = $2 RETURNING *`;
    const result = await db.query(sql, [pin, id]);
    return result.rows[0];
};

exports.getRequestWithOwnerById = async (requestId) => {
    await ensureRequestSchema();
    const sql = `
        SELECT
            requests.id,
            requests.item_id,
            requests.status,
            requests.handover_pin,
            requests.requester_email,
            requests.requester_location,
            requests.requester_latitude,
            requests.requester_longitude,
            requests.delivery_instructions,
            items.user_id AS owner_user_id,
            items.title AS item_title,
            items.location AS item_location,
            items.latitude AS item_latitude,
            items.longitude AS item_longitude,
            users.id AS owner_id,
            users.email AS owner_email
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        WHERE requests.id = $1
          AND requests.archived_at IS NULL
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
    `;
    const result = await db.query(sql, [requestId]);
    return result.rows[0] || null;
};

exports.updateStatus = async (id, status) => {
    await ensureRequestSchema();
    const requestResult = await db.query('SELECT item_id FROM requests WHERE id = $1 AND archived_at IS NULL', [id]);
    const itemId = requestResult.rows[0]?.item_id;
    if (!itemId) return 0;

    const client = await db.connect();
    await client.query('BEGIN');
    try {
        if (status === 'accepted') {
            await client.query("UPDATE items SET status = 'claimed' WHERE id = $1", [itemId]);
            await client.query("UPDATE requests SET status = 'rejected' WHERE item_id = $1 AND id <> $2 AND status = 'pending'", [itemId, id]);
        } else if (status === 'completed') {
            await client.query("UPDATE items SET status = 'given' WHERE id = $1", [itemId]);
        } else if (status === 'rejected') {
            const accepted = await client.query("SELECT 1 FROM requests WHERE item_id = $1 AND status = 'accepted' AND id <> $2", [itemId, id]);
            if (accepted.rowCount === 0) await client.query("UPDATE items SET status = 'available' WHERE id = $1 AND status = 'claimed'", [itemId]);
        }
        const result = await client.query("UPDATE requests SET status = $1 WHERE id = $2", [status, id]);
        await client.query('COMMIT');
        return result.rowCount;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

exports.getRequestMessages = async (requestId, userEmail) => {
    await ensureRequestSchema();
    const reqRes = await db.query(
        `
        SELECT requests.id, requests.requester_email, users.email AS owner_email
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        WHERE requests.id = $1
          AND requests.archived_at IS NULL
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
        `,
        [requestId]
    );

    if (reqRes.rows.length === 0) return null;
    const reqData = reqRes.rows[0];
    const normalizedUser = String(userEmail || '').trim().toLowerCase();
    const isOwner = String(reqData.owner_email || '').trim().toLowerCase() === normalizedUser;
    const isRequester = String(reqData.requester_email || '').trim().toLowerCase() === normalizedUser;
    if (!isOwner && !isRequester) return null;

    await db.query(
        `
        INSERT INTO request_message_reads (request_id, user_email, last_read_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (request_id, user_email)
        DO UPDATE SET last_read_at = CURRENT_TIMESTAMP
        `,
        [requestId, normalizedUser]
    );

    const msgs = await db.query(
        `
        SELECT id, request_id, sender_email, message, created_at
        FROM request_messages
        WHERE request_id = $1
        ORDER BY id ASC
        `,
        [requestId]
    );
    return msgs.rows;
};

exports.createRequestMessage = async (requestId, senderEmail, message) => {
    await ensureRequestSchema();
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
        const err = new Error("Message cannot be empty.");
        err.statusCode = 400;
        throw err;
    }

    const reqRes = await db.query(
        `
        SELECT requests.id, requests.status, requests.requester_email, users.email AS owner_email
        FROM requests
        JOIN items ON requests.item_id = items.id
        JOIN users ON items.user_id = users.id
        WHERE requests.id = $1
          AND requests.archived_at IS NULL
          AND items.archived_at IS NULL
          AND users.archived_at IS NULL
        `,
        [requestId]
    );
    if (reqRes.rows.length === 0) {
        const err = new Error("Request not found.");
        err.statusCode = 404;
        throw err;
    }

    const reqData = reqRes.rows[0];
    const normalizedSender = String(senderEmail || '').trim().toLowerCase();
    const isOwner = String(reqData.owner_email || '').trim().toLowerCase() === normalizedSender;
    const isRequester = String(reqData.requester_email || '').trim().toLowerCase() === normalizedSender;

    if (!isOwner && !isRequester) {
        const err = new Error("You are not part of this request.");
        err.statusCode = 403;
        throw err;
    }

    if (String(reqData.status || '').toLowerCase() !== 'accepted' && String(reqData.status || '').toLowerCase() !== 'completed') {
        const err = new Error("Chat is only active for accepted or completed requests.");
        err.statusCode = 400;
        throw err;
    }

    const insertRes = await db.query(
        `
        INSERT INTO request_messages (request_id, sender_email, message)
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [requestId, normalizedSender, cleanMessage]
    );

    const recipientEmail = isOwner ? reqData.requester_email : reqData.owner_email;
    return {
        message: insertRes.rows[0],
        recipientEmail: String(recipientEmail).toLowerCase()
    };
};

exports.createNotification = async (param1, typeArg, titleArg, bodyArg, requestIdArg) => {
    await ensureRequestSchema();
    let userEmail, type, title, body, requestId;
    if (typeof param1 === 'object' && param1 !== null) {
        userEmail = param1.userEmail;
        type = param1.type;
        title = param1.title;
        body = param1.body;
        requestId = param1.requestId;
    } else {
        userEmail = param1;
        type = typeArg;
        title = titleArg;
        body = bodyArg;
        requestId = requestIdArg;
    }
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    const res = await db.query(
        `
        INSERT INTO notifications (user_email, type, title, body, request_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [cleanEmail, type, title, body, requestId || null]
    );
    return res.rows[0];
};

exports.getNotificationsForUser = async (userEmail) => {
    await ensureRequestSchema();
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    const res = await db.query(
        `
        SELECT *
        FROM notifications
        WHERE LOWER(TRIM(user_email)) = $1
        ORDER BY id DESC
        LIMIT 30
        `,
        [cleanEmail]
    );
    return res.rows;
};

exports.markNotificationAsRead = async (notificationId, userEmail) => {
    await ensureRequestSchema();
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    const res = await db.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1 AND LOWER(TRIM(user_email)) = $2
        RETURNING *
        `,
        [notificationId, cleanEmail]
    );
    return res.rows[0] || null;
};

exports.markAllNotificationsAsRead = async (userEmail) => {
    await ensureRequestSchema();
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    const res = await db.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE LOWER(TRIM(user_email)) = $1 AND is_read = FALSE
        RETURNING id
        `,
        [cleanEmail]
    );
    return res.rowCount || 0;
};

exports.markAllNotificationsRead = exports.markAllNotificationsAsRead;
exports.markNotificationRead = exports.markNotificationAsRead;
exports.getNotificationsByUser = exports.getNotificationsForUser;

// Aliases and helpers for controller compatibility
exports.getMessagesByRequestId = async (requestId) => {
    await ensureRequestSchema();
    const msgs = await db.query(
        "SELECT id, request_id, sender_email, message, created_at FROM request_messages WHERE request_id = $1 ORDER BY id ASC",
        [requestId]
    );
    return msgs.rows;
};

exports.markMessagesRead = async (requestId, userEmail) => {
    await ensureRequestSchema();
    return db.query(
        "INSERT INTO request_message_reads (request_id, user_email, last_read_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (request_id, user_email) DO UPDATE SET last_read_at = CURRENT_TIMESTAMP",
        [requestId, String(userEmail || '').trim().toLowerCase()]
    );
};

exports.createMessage = async (requestId, senderEmail, message) => {
    await ensureRequestSchema();
    const res = await db.query(
        "INSERT INTO request_messages (request_id, sender_email, message) VALUES ($1, $2, $3) RETURNING *",
        [requestId, String(senderEmail || '').trim().toLowerCase(), message]
    );
    return res.rows[0];
};

exports.countRecentMessagesForSender = async (requestId, senderEmail, seconds = 60) => {
    await ensureRequestSchema();
    const res = await db.query(
        "SELECT COUNT(*) FROM request_messages WHERE request_id = $1 AND LOWER(TRIM(sender_email)) = $2 AND created_at > (CURRENT_TIMESTAMP - INTERVAL '60 seconds')",
        [requestId, String(senderEmail || '').trim().toLowerCase()]
    );
    return parseInt(res.rows[0].count, 10) || 0;
};

exports.getNotificationsByUser = exports.getNotificationsForUser;
exports.markNotificationRead = exports.markNotificationAsRead;

