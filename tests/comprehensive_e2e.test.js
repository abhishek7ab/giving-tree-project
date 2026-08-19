const request = require('supertest');
const fs = require('fs');
const path = require('path');

const app = require('../server');

describe('Comprehensive End-to-End System Audit', () => {

    describe('1. Static HTML Frontend Pages Deliverability', () => {
        const pages = [
            '/',
            '/index.html',
            '/items.html',
            '/post-item.html',
            '/my-items.html',
            '/requests.html',
            '/profile.html',
            '/login.html',
            '/register.html',
            '/admin.html'
        ];

        pages.forEach(route => {
            it(`serves ${route} with HTTP 200 and valid HTML content`, async () => {
                const res = await request(app).get(route);
                expect(res.status).toBe(200);
                expect(res.headers['content-type']).toMatch(/html/);
                expect(res.text.length).toBeGreaterThan(100);
                // Verify no raw unescaped template tags or corrupt script tags
                expect(res.text).not.toContain('<script src="undefined"');
                expect(res.text).not.toContain('<link rel="stylesheet" href="undefined"');
            });
        });
    });

    describe('2. Clean Donation Experience and Streamlined Layout', () => {
        it('index.html contains concise donation terminology and no drives section', async () => {
            const res = await request(app).get('/index.html');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Donate.<br>');
            expect(res.text).toContain('Browse Donations');
            expect(res.text).toContain('Donate an Item');
            expect(res.text).not.toContain('Active Pune Donation Drives');
            expect(res.text).not.toContain('Vidya Jyoti Foundation');
            expect(res.text).not.toContain('Door Step School Pune');
            expect(res.text).not.toContain('Snehalaya Pune Outreach');
            expect(res.text).not.toContain('ResQ Pet Sanctuary');
        });

        it('post-item.html contains streamlined donation fields', async () => {
            const res = await request(app).get('/post-item.html');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Donate to');
            expect(res.text).toContain('What item are you donating?');
            expect(res.text).toContain('Donation Category');
            expect(res.text).not.toContain('Vidya Jyoti');
            expect(res.text).not.toContain('Door Step School');
        });

        it('my-items.html contains My Donations and proper top-padding clearance', async () => {
            const res = await request(app).get('/my-items.html');
            expect(res.status).toBe(200);
            expect(res.text).toContain('My Community Donations');
            expect(res.text).toContain('My Donated Items');
            expect(res.text).toContain('Donate New Item');
            expect(res.text).toContain('my-items-wrapper');
        });

        it('requests.html contains Donation Activity Hub', async () => {
            const res = await request(app).get('/requests.html');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Donation Activity &amp; <span>Coordination</span>');
            expect(res.text).toContain('Requests For Your Donations');
            expect(res.text).toContain('Donations You\'ve Requested');
        });
    });

    describe('3. Critical CSS & Static Assets Existence', () => {
        const cssFiles = [
            'variables.css',
            'base.css',
            'navbar.css',
            'footer.css',
            'buttons.css',
            'cards.css',
            'ui.css',
            'animations.css',
            'pages.css'
        ];

        cssFiles.forEach(file => {
            it(`verifies frontend/assets/style/${file} exists and is non-empty`, () => {
                const filePath = path.join(__dirname, '..', 'frontend', 'assets', 'style', file);
                expect(fs.existsSync(filePath)).toBe(true);
                const stat = fs.statSync(filePath);
                expect(stat.size).toBeGreaterThan(50);
            });
        });
    });

    describe('4. Security & Error Handling Defenses', () => {
        it('rejects malformed registration payload with HTTP 400', async () => {
            const res = await request(app)
                .post('/register')
                .set('Accept', 'application/json')
                .send({ email: 'not-an-email', password: '123' });
            expect(res.status).toBe(400);
        });

        it('returns defensive HTTP headers on all responses', async () => {
            const res = await request(app).get('/items.html');
            expect(res.headers['x-content-type-options']).toBe('nosniff');
            expect(res.headers['x-frame-options']).toBe('DENY');
            expect(res.headers['permissions-policy']).toBeDefined();
        });
    });
});
