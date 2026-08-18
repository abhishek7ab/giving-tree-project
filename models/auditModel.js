const db = require('../database/db');

let auditSchemaEnsured = false;

async function ensureAuditSchema() {
    if (auditSchemaEnsured) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            user_email VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            details TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    auditSchemaEnsured = true;
}

const auditModel = {
    async logEvent({ userId = null, userEmail = null, action, details = null, req = null }) {
        try {
            await ensureAuditSchema();
            let ipAddress = null;
            let userAgent = null;

            if (req) {
                const forwarded = req.headers['x-forwarded-for'];
                ipAddress = forwarded ? String(forwarded).split(',')[0].trim() : req.socket?.remoteAddress || req.ip || null;
                userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 255) : null;
                if (!userId && req.user?.id) userId = req.user.id;
                if (!userEmail && req.user?.email) userEmail = req.user.email;
            }

            const query = `
                INSERT INTO audit_logs (user_id, user_email, action, details, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *;
            `;
            const values = [
                userId ? Number(userId) : null,
                userEmail ? String(userEmail).trim().toLowerCase() : null,
                String(action || 'UNKNOWN_ACTION'),
                details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
                ipAddress ? String(ipAddress).slice(0, 45) : null,
                userAgent
            ];
            const res = await db.query(query, values);
            return res.rows[0];
        } catch (err) {
            console.error('AUDIT LOG ERROR:', err.message);
            return null; // Audit logging should never crash the main transaction
        }
    },

    async getRecentAuditLogs(limit = 50) {
        await ensureAuditSchema();
        const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
        const query = `
            SELECT *
            FROM audit_logs
            ORDER BY id DESC
            LIMIT $1;
        `;
        const res = await db.query(query, [safeLimit]);
        return res.rows;
    }
};

module.exports = auditModel;
