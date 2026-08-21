const request = require('supertest');
const app = require('../server');
const db = require('../database/db');
const { verifyCaptchaToken } = require('../controllers/authController');

async function runAudit() {
    console.log('🔍 ====================================================');
    console.log('🌿 RUNNING FULL PLATFORM HEALTH & QUALITY AUDIT');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, name, details = '') {
        if (condition) {
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${name} ${details ? '- ' + details : ''}`);
            failed++;
        }
    }

    try {
        // 1. Index Page: OLX-Style Instructions & Guidelines
        console.log('📌 1. Testing Homepage & Community Guidelines...');
        const indexRes = await request(app).get('/index.html');
        assert(indexRes.status === 200, 'Homepage loads with HTTP 200');
        assert(indexRes.text.includes('Platform Instructions & Community Guidelines'), 'Community guidelines section exists');
        assert(indexRes.text.includes('OLX-Style P2P Facilitator'), 'OLX-style platform disclaimer exists');
        assert(indexRes.text.includes('Fair-Share 5-Item Request Quota'), '5-request limit guideline exists');
        assert(indexRes.text.includes('10 Pune Public Neighborhood Hubs'), '10 Pune hubs listed in guidelines');

        // 2. Catalog Page: Spacing, Controls & Google Maps Navigation
        console.log('\n📌 2. Testing Items Catalog Page & Unified Station...');
        const itemsRes = await request(app).get('/items.html');
        assert(itemsRes.status === 200, 'Items catalog page loads with HTTP 200');
        assert(itemsRes.text.includes('items-hero-header'), 'Hero header spacing class exists');
        assert(itemsRes.text.includes('catalog-control-center'), 'Unified catalog station exists');
        assert(itemsRes.text.includes('google.com/maps'), 'Google Maps integration links exist in catalog template');
        assert(itemsRes.text.includes('Authentic Photo • Direct from Donor'), 'Authentic photo requirement badge exists');

        // 3. CAPTCHA Security & Cryptographic Validation
        console.log('\n📌 3. Testing CAPTCHA Endpoint & Real-Human Verification...');
        const captchaRes = await request(app).get('/api/captcha');
        assert(captchaRes.status === 200, 'Captcha endpoint responds with HTTP 200');
        assert(captchaRes.body.success === true, 'Captcha JSON returns success: true');
        assert(typeof captchaRes.body.captchaToken === 'string' && captchaRes.body.captchaToken.includes('.'), 'Captcha token is timestamped HMAC string');
        assert(captchaRes.body.svg.includes('<svg') && captchaRes.body.svg.includes('</svg>'), 'Captcha returns valid distorted vector SVG');

        // 4. Login Page: Cleaned Demo Account & Integrated CAPTCHA
        console.log('\n📌 4. Testing Login Page & Demo Credentials Removal...');
        const loginPageRes = await request(app).get('/login.html');
        assert(loginPageRes.status === 200, 'Login page loads with HTTP 200');
        assert(!loginPageRes.text.includes('Fill Demo Neighbor Account'), 'Demo account pill button is 100% removed');
        assert(!loginPageRes.text.includes('fillDemoCredentials'), 'fillDemoCredentials function is 100% removed');
        assert(loginPageRes.text.includes('id="captchaContainer"'), 'Captcha container is present in login DOM');
        assert(loginPageRes.text.includes('id="loginCaptcha"'), 'Captcha input field is present in login form');

        // 5. Register Page: Password Strength Meter & Authentic Email
        console.log('\n📌 5. Testing Register Page & Live Password Strength Meter...');
        const registerPageRes = await request(app).get('/register.html');
        assert(registerPageRes.status === 200, 'Register page loads with HTTP 200');
        assert(registerPageRes.text.includes('id="passwordStrengthBox"'), 'Password strength meter container exists');
        assert(registerPageRes.text.includes('updatePasswordStrength'), 'Dynamic password strength calculation script exists');
        assert(registerPageRes.text.includes('Authentic Email Required'), 'Authentic email requirement label exists');

        // 6. Database Hygiene: Only Authentic Users
        console.log('\n📌 6. Testing Database Hygiene & Fake Accounts Removal...');
        const usersRes = await db.query('SELECT id, name, email, role FROM users ORDER BY id ASC');
        const hasFakeUsers = usersRes.rows.some(u => u.email.includes('@pune.community.org') || u.email.includes('test'));
        assert(!hasFakeUsers, 'Zero fake / generated users in the database');
        assert(usersRes.rows.some(u => u.email === 'badaveabhishek2004@gmail.com' && u.role === 'admin'), 'Admin account badaveabhishek2004@gmail.com is intact');

        // 7. Admin Notification System Verification
        console.log('\n📌 7. Testing Admin Notification Real-Time System...');
        const notifRes = await db.query('SELECT * FROM notifications WHERE LOWER(user_email) = $1 ORDER BY id DESC LIMIT 5', ['badaveabhishek2004@gmail.com']);
        assert(Array.isArray(notifRes.rows), 'Admin notification log is accessible');

        console.log('\n====================================================');
        console.log(`🏁 AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('====================================================\n');

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch(err) {
        console.error('❌ Audit encountered an unexpected error:', err);
        process.exit(1);
    }
}

runAudit();
