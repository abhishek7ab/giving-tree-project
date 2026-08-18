const db = require('./db');

async function initDB() {
    try {
        console.log('⏳ Initializing database schema...');

        // Create base tables if they don't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                city VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                location VARCHAR(255),
                image VARCHAR(255),
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'available',
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS requests (
                id SERIAL PRIMARY KEY,
                item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
                requester_email VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Apply migrations/updates
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(10)");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await db.query("ALTER TABLE items ALTER COLUMN image TYPE TEXT");
        await db.query("ALTER TABLE items ALTER COLUMN description TYPE TEXT");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS condition VARCHAR(30)");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS pickup_availability VARCHAR(100)");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS weight_category VARCHAR(50) DEFAULT 'Light (Easy to carry)'");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT FALSE");
        await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP");
        await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_location TEXT");
        await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_latitude DOUBLE PRECISION");
        await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_longitude DOUBLE PRECISION");
        await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS delivery_instructions TEXT");
        await db.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

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

        // Reviews / Feedback after handover
        await db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
                reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Saved Items / Wishlist
        await db.query(`
            CREATE TABLE IF NOT EXISTS saved_items (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, item_id)
            )
        `);

        // Security Audit Logs
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

        // Database Indexes for Fast Query Performance
        await db.query("CREATE INDEX IF NOT EXISTS idx_items_status_category ON items(status, category)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_requests_item_id ON requests(item_id)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_requests_requester_email ON requests(requester_email)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_email, is_read)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_reviews_request ON reviews(request_id)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id)");
        await db.query("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_unique_name ON users (LOWER(TRIM(name))) WHERE archived_at IS NULL");
        await db.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email, created_at DESC)");

        // Full-text search setup
        await db.query(`
            ALTER TABLE items ADD COLUMN IF NOT EXISTS search_vector tsvector
        `);
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_items_search_vector ON items USING GIN(search_vector)
        `);
        await db.query(`
            CREATE OR REPLACE FUNCTION update_items_search_vector()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.search_vector := 
                    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'D');
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);
        await db.query(`
            DROP TRIGGER IF EXISTS trigger_update_items_search_vector ON items;
            CREATE TRIGGER trigger_update_items_search_vector
            BEFORE INSERT OR UPDATE ON items
            FOR EACH ROW EXECUTE FUNCTION update_items_search_vector();
        `);
        // Backfill existing records
        await db.query(`
            UPDATE items SET search_vector = 
                setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
                setweight(to_tsvector('english', COALESCE(location, '')), 'D')
            WHERE search_vector IS NULL
        `);

        // Additional performance indexes
        await db.query("CREATE INDEX IF NOT EXISTS idx_items_status_category_created ON items(status, category, created_at DESC)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_items_user_created ON items(user_id, created_at DESC)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests(status, created_at DESC)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_requests_item_status ON requests(item_id, status)");
        await db.query("CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_email, created_at DESC)");

        // Backfill coordinates for known Pune locations if missing
        await db.query(`
            UPDATE items SET latitude = 18.4575, longitude = 73.8677, location = 'Katraj, Pune'
            WHERE (location ILIKE '%katraj%' OR title ILIKE '%katraj%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5089, longitude = 73.9259, location = 'Hadapsar, Pune'
            WHERE (location ILIKE '%hadap%' OR title ILIKE '%hadap%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5074, longitude = 73.8077, location = 'Kothrud, Pune'
            WHERE (location ILIKE '%kothrud%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5590, longitude = 73.7868, location = 'Baner, Pune'
            WHERE (location ILIKE '%baner%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5284, longitude = 73.8417, location = 'FC Road, Pune'
            WHERE (location ILIKE '%fc%' OR location ILIKE '%shivaji%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5913, longitude = 73.7389, location = 'Hinjawadi, Pune'
            WHERE (location ILIKE '%hinjawadi%' OR location ILIKE '%hinjewadi%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5679, longitude = 73.9143, location = 'Viman Nagar, Pune'
            WHERE (location ILIKE '%viman%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE items SET latitude = 18.5362, longitude = 73.8940, location = 'Koregaon Park, Pune'
            WHERE (location ILIKE '%koregaon%') AND (latitude IS NULL OR longitude IS NULL);

            UPDATE users SET city = 'Kothrud, Pune', latitude = 18.5074, longitude = 73.8077
            WHERE (city IS NULL OR city = '') AND archived_at IS NULL;
        `);

        console.log('✅ Database schema initialized successfully.');
    } catch (err) {
        console.error('❌ Database initialization error:', err.message);
        throw err;
    }
}

module.exports = initDB;
