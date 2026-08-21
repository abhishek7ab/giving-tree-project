const request = require('supertest');
const app = require('../server');

jest.setTimeout(30000);

describe('Full Giving Tree End-to-End User Flow & Handover Testing', () => {
    let donorCookie = null;
    let requesterCookie = null;
    let donorId = null;
    let requesterId = null;
    let itemId = null;
    let requestId = null;
    let handoverPin = null;

    const timestamp = Date.now();
    const donorName = `Aarav ${timestamp}`;
    const requesterName = `Pooja ${timestamp}`;
    const donorEmail = `donor_${timestamp}@pune.community.org`;
    const requesterEmail = `requester_${timestamp}@pune.community.org`;
    const password = 'SafePassword123!';

    test('1. Register Donor account & preserve session', async () => {
        const res = await request(app)
            .post('/register')
            .send({
                name: donorName,
                email: donorEmail,
                password: password,
                phone: '9876543210',
                city: 'Kothrud, Pune'
            });
        
        expect(res.status).toBe(302); // Redirects to login on register
    });

    test('2. Donor logs in and receives secure auth cookie', async () => {
        const res = await request(app)
            .post('/login')
            .set('Accept', 'application/json')
            .send({
                email: donorEmail,
                password: password
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.headers['set-cookie']).toBeDefined();
        donorCookie = res.headers['set-cookie'];

        const profileRes = await request(app)
            .get('/api/user')
            .set('Cookie', donorCookie);
        
        expect(profileRes.status).toBe(200);
        expect(profileRes.body.loggedIn).toBe(true);
        expect(profileRes.body.email).toBe(donorEmail);
        donorId = profileRes.body.id;
    });

    test('3. Register Requester account & log in', async () => {
        const regRes = await request(app)
            .post('/register')
            .send({
                name: requesterName,
                email: requesterEmail,
                password: password,
                phone: '9822001122',
                city: 'Baner, Pune'
            });

        expect(regRes.status).toBe(302);

        const loginRes = await request(app)
            .post('/login')
            .set('Accept', 'application/json')
            .send({
                email: requesterEmail,
                password: password
            });

        expect(loginRes.status).toBe(200);
        requesterCookie = loginRes.headers['set-cookie'];

        const profileRes = await request(app)
            .get('/api/user')
            .set('Cookie', requesterCookie);
        
        expect(profileRes.body.loggedIn).toBe(true);
        requesterId = profileRes.body.id;
    });

    test('4. Donor creates a donation item in Pune', async () => {
        const dummyJpeg = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0xFF, 0xD9
        ]);

        const res = await request(app)
            .post('/post-item')
            .set('Cookie', donorCookie)
            .set('Accept', 'application/json')
            .field('title', 'Higher Engineering Mathematics (B.S. Grewal)')
            .field('description', 'Used for semester 1 & 2. In excellent condition with clean pages.')
            .field('location', 'Kothrud, Pune')
            .field('category', 'Books')
            .field('condition', 'Good')
            .field('latitude', '18.5074')
            .field('longitude', '73.8077')
            .attach('image', dummyJpeg, 'textbook.jpg');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.item).toBeDefined();
        itemId = res.body.item.id;
    });

    test('5. Requester requests the item with delivery meetup location', async () => {
        const res = await request(app)
            .post('/request-item')
            .set('Cookie', requesterCookie)
            .set('Accept', 'application/json')
            .send({
                item_id: itemId,
                requester_location: 'Kothrud, Pune',
                requester_latitude: 18.5080,
                requester_longitude: 73.8090,
                delivery_instructions: 'Can meet near MIT College Main Gate around 5 PM.'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const reqObj = res.body.request || res.body;
        expect(reqObj.id).toBeDefined();
        requestId = reqObj.id;
    });

    test('6. Donor views Activity Hub & accepts the request (generating Handover PIN)', async () => {
        const activityRes = await request(app)
            .get('/api/activity/data')
            .set('Cookie', donorCookie);

        expect(activityRes.status).toBe(200);
        expect(activityRes.body.received).toBeDefined();
        const incomingReq = activityRes.body.received.find(r => r.id === requestId);
        expect(incomingReq).toBeDefined();
        expect(incomingReq.status).toBe('pending');

        // Donor accepts the request
        const acceptRes = await request(app)
            .post('/update-status')
            .set('Cookie', donorCookie)
            .set('Accept', 'application/json')
            .send({
                id: requestId,
                status: 'accepted'
            });

        expect(acceptRes.status).toBe(200);
        expect(acceptRes.body.success).toBe(true);
    });

    test('7. Requester receives accepted status & 4-digit Handover PIN', async () => {
        const requesterActivity = await request(app)
            .get('/api/activity/data')
            .set('Cookie', requesterCookie);

        expect(requesterActivity.status).toBe(200);
        const sentReq = requesterActivity.body.sent.find(r => r.id === requestId);
        expect(sentReq).toBeDefined();
        expect(sentReq.status).toBe('accepted');
        expect(sentReq.handover_pin).toBeDefined();
        expect(String(sentReq.handover_pin)).toMatch(/^\d{4}$/);
        handoverPin = String(sentReq.handover_pin);
    });

    test('8. Real-time chat: Requester sends a coordination message', async () => {
        const res = await request(app)
            .post(`/api/requests/${requestId}/messages`)
            .set('Cookie', requesterCookie)
            .set('Accept', 'application/json')
            .send({
                message: 'Hello Aarav! I am available tomorrow at 5 PM near the gate. 🌿'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBeDefined();
        expect(res.body.message.message).toContain('Hello Aarav!');
    });

    test('9. Real-time chat: Donor replies with confirmation', async () => {
        const res = await request(app)
            .post(`/api/requests/${requestId}/messages`)
            .set('Cookie', donorCookie)
            .set('Accept', 'application/json')
            .send({
                message: 'Sounds great Pooja! I will bring the textbook with me.'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Fetch conversation thread
        const threadRes = await request(app)
            .get(`/api/requests/${requestId}/messages`)
            .set('Cookie', donorCookie);

        expect(threadRes.status).toBe(200);
        expect(threadRes.body.messages.length).toBeGreaterThanOrEqual(2);
        expect(threadRes.body.messages[0].sender_email).toBe(requesterEmail);
        expect(threadRes.body.messages[1].sender_email).toBe(donorEmail);
    });

    test('10. Handover PIN verification: Rejects incorrect PIN', async () => {
        const wrongRes = await request(app)
            .post('/update-status')
            .set('Cookie', donorCookie)
            .set('Accept', 'application/json')
            .send({
                id: requestId,
                status: 'completed',
                pin: '0000' // Deliberately invalid PIN
            });

        expect(wrongRes.status).toBe(400);
        expect(wrongRes.body.error).toContain('Incorrect');
    });

    test('11. Handover PIN verification: Accepts valid PIN and completes handover', async () => {
        const correctRes = await request(app)
            .post('/update-status')
            .set('Cookie', donorCookie)
            .set('Accept', 'application/json')
            .send({
                id: requestId,
                status: 'completed',
                pin: handoverPin
            });

        expect(correctRes.status).toBe(200);
        expect(correctRes.body.success).toBe(true);

        // Verify status in DB
        const checkRes = await request(app)
            .get('/api/activity/data')
            .set('Cookie', donorCookie);
        
        const completedReq = checkRes.body.received.find(r => r.id === requestId);
        expect(completedReq.status).toBe('completed');
    });

    test('12. Requester leaves a 5-star gratitude review', async () => {
        const reviewRes = await request(app)
            .post('/api/reviews')
            .set('Cookie', requesterCookie)
            .set('Accept', 'application/json')
            .send({
                request_id: requestId,
                rating: 5,
                comment: 'Amazing neighbor! The book was in perfect condition and handover was super smooth.'
            });

        expect(reviewRes.status).toBe(200);
        expect(reviewRes.body.success).toBe(true);
    });

    test('13. Donor public profile displays updated rating & review', async () => {
        const pubRes = await request(app)
            .get(`/api/users/${donorId}/public`);

        expect(pubRes.status).toBe(200);
        expect(pubRes.body.name).toBe(donorName);
        expect(pubRes.body.stats).toBeDefined();
        expect(Number(pubRes.body.stats.items_given)).toBeGreaterThanOrEqual(1);
        expect(Number(pubRes.body.stats.total_reviews)).toBeGreaterThanOrEqual(1);
        expect(pubRes.body.recent_reviews.some(r => r.comment.includes('Amazing neighbor!'))).toBe(true);
    });

    test('14. Session continuity: Updating user profile name refreshes tokenVersion without logging out', async () => {
        const updatedName = `${donorName} Verified`;
        const updateNameRes = await request(app)
            .post('/api/user/update-name')
            .set('Cookie', donorCookie)
            .set('Accept', 'application/json')
            .send({
                name: updatedName
            });

        expect(updateNameRes.status).toBe(200);
        expect(updateNameRes.body.success).toBe(true);
        expect(updateNameRes.headers['set-cookie']).toBeDefined();
        const updatedCookie = updateNameRes.headers['set-cookie'];

        // Ensure session remains valid on subsequent protected call
        const checkAuthRes = await request(app)
            .get('/api/user')
            .set('Cookie', updatedCookie);

        expect(checkAuthRes.status).toBe(200);
        expect(checkAuthRes.body.loggedIn).toBe(true);
        expect(checkAuthRes.body.name).toBe(updatedName);
    });

    afterAll(async () => {
        const db = require('../database/db');
        try {
            await db.query('DELETE FROM users WHERE email LIKE $1 OR email LIKE $2', [
                `%${timestamp}%`,
                '%@pune.community.org%'
            ]);
        } catch(e) {}
        if (db.pool && typeof db.pool.end === 'function') {
            await db.pool.end().catch(() => {});
        }
    });
});
