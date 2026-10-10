const db = require('../database/db');

(async () => {
    try {
        const r = await db.query(
            "SELECT id, name, email FROM users WHERE name LIKE 'WishTester_%' OR email LIKE 'wishlist_tester_%@example.com'"
        );
        console.log('Found leftover test users:', r.rows.length);
        r.rows.forEach(u => console.log(' -', u.id, u.name, u.email));

        if (r.rows.length > 0) {
            const ids = r.rows.map(u => u.id);
            const emails = r.rows.map(u => u.email);

            await db.query('DELETE FROM community_wishes WHERE user_id = ANY($1)', [ids]);
            await db.query('DELETE FROM requests WHERE requester_email = ANY($1)', [emails]);
            await db.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
            console.log('Deleted', ids.length, 'test user(s) successfully.');
        } else {
            console.log('No leftover test users found — DB is clean!');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit(0);
    }
})();
