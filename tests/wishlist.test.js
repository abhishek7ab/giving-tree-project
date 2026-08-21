const request = require('supertest');
const app = require('../server');
const db = require('../database/db');
const initDB = require('../database/init');

jest.setTimeout(30000);

describe('Community Wishlist & Items Wanted Matching Board API Suite', () => {
    let testUser = null;
    let testCookie = null;
    let createdWishId = null;

    const uniqueTimestamp = Date.now();
    const testUserData = {
        name: `WishTester_${uniqueTimestamp}`,
        email: `wishlist_tester_${uniqueTimestamp}@example.com`,
        password: 'Password123!@#',
        phone: '9876543210',
        city: 'Kothrud, Pune'
    };

    beforeAll(async () => {
        await initDB();

        // Register test user
        const regRes = await request(app)
            .post('/register')
            .send({
                name: testUserData.name,
                email: testUserData.email,
                password: testUserData.password,
                phone: testUserData.phone,
                city: testUserData.city
            });

        expect(regRes.status).toBe(302);

        // Login to get session cookie
        const loginRes = await request(app)
            .post('/login')
            .set('Accept', 'application/json')
            .send({
                email: testUserData.email,
                password: testUserData.password
            });

        expect(loginRes.status).toBe(200);
        testCookie = loginRes.headers['set-cookie'];

        const userRow = await db.query('SELECT id, name, email FROM users WHERE email = $1', [testUserData.email]);
        testUser = userRow.rows[0];
    });

    afterAll(async () => {
        // Strict Teardown: Clean up all test artifacts
        if (testUser && testUser.id) {
            await db.query('DELETE FROM community_wishes WHERE user_id = $1', [testUser.id]);
            await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        }
    });

    it('should reject wish creation if user is not authenticated', async () => {
        const res = await request(app)
            .post('/api/wishes')
            .send({
                title: 'Need 10th Class Books',
                category: 'Books',
                locality: 'Kothrud, Pune',
                urgency: 'Normal'
            });

        expect(res.status).toBe(401);
    });

    it('should reject wish creation with missing or invalid title', async () => {
        const res = await request(app)
            .post('/api/wishes')
            .set('Cookie', testCookie)
            .send({
                title: 'ab', // too short
                category: 'Books',
                locality: 'Kothrud, Pune',
                urgency: 'Normal'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
    });

    it('should reject wish creation with invalid category', async () => {
        const res = await request(app)
            .post('/api/wishes')
            .set('Cookie', testCookie)
            .send({
                title: 'Need NCERT Science Books',
                category: 'InvalidCategory123',
                locality: 'Kothrud, Pune',
                urgency: 'Normal'
            });

        expect(res.status).toBe(400);
    });

    it('should successfully create a valid community wish', async () => {
        const res = await request(app)
            .post('/api/wishes')
            .set('Cookie', testCookie)
            .send({
                title: 'Need Class 10 NCERT Science Textbooks',
                description: 'Looking for Marathi or English medium books for upcoming exams.',
                category: 'Books',
                locality: 'Kothrud, Pune',
                urgency: 'Urgent'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.wish).toBeDefined();
        expect(res.body.wish.title).toBe('Need Class 10 NCERT Science Textbooks');
        expect(res.body.wish.urgency).toBe('Urgent');
        expect(res.body.wish.status).toBe('open');

        createdWishId = res.body.wish.id;
    });

    it('should list public wishes with category and locality filtering', async () => {
        const res = await request(app)
            .get('/api/wishes')
            .query({ category: 'Books', locality: 'Kothrud' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.wishes)).toBe(true);
        const match = res.body.wishes.find(w => w.id === createdWishId);
        expect(match).toBeDefined();
        expect(match.category).toBe('Books');
    });

    it('should find matching wishes for donor item category and location', async () => {
        const res = await request(app)
            .get('/api/wishes/match')
            .query({ category: 'Books', locality: 'Kothrud' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.matches.length).toBeGreaterThanOrEqual(1);
        expect(res.body.matches.some(w => w.id === createdWishId)).toBe(true);
    });

    it('should fetch authenticated user own wishes', async () => {
        const res = await request(app)
            .get('/api/wishes/my')
            .set('Cookie', testCookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.wishes)).toBe(true);
        expect(res.body.wishes.some(w => w.id === createdWishId)).toBe(true);
    });

    it('should mark a wish as fulfilled by the owner', async () => {
        const res = await request(app)
            .post(`/api/wishes/${createdWishId}/fulfill`)
            .set('Cookie', testCookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.wish.status).toBe('fulfilled');

        // Verify it is no longer listed in open public wishes
        const openWishesRes = await request(app).get('/api/wishes?status=open');
        const match = openWishesRes.body.wishes.find(w => w.id === createdWishId);
        expect(match).toBeUndefined();
    });

    it('should delete a wish by the owner', async () => {
        // Create another wish to test deletion
        const createRes = await request(app)
            .post('/api/wishes')
            .set('Cookie', testCookie)
            .send({
                title: 'Temporary Study Table',
                category: 'Furniture',
                locality: 'Kothrud, Pune',
                urgency: 'Flexible'
            });
        
        expect(createRes.status).toBe(201);
        const tempWishId = createRes.body.wish.id;

        const res = await request(app)
            .delete(`/api/wishes/${tempWishId}`)
            .set('Cookie', testCookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const checkRes = await request(app)
            .get('/api/wishes/my')
            .set('Cookie', testCookie);
        expect(checkRes.body.wishes.some(w => w.id === tempWishId)).toBe(false);
    });
});
