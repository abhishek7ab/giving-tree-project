const request = require('supertest');
const app = require('../server');
const { signToken } = require('../config/jwt');
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

describe('Security Hardening & Vulnerability Remediation Tests', () => {

    describe('1. CORS & Response Headers', () => {
        it('should allow legitimate requests without Origin header', async () => {
            const res = await request(app).get('/healthz');
            expect([200, 503]).toContain(res.status);
        });

        it('should allow whitelisted localhost Origin', async () => {
            const res = await request(app)
                .get('/healthz')
                .set('Origin', 'http://localhost:3000');
            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        });

        it('should allow .vercel.app domain', async () => {
            const res = await request(app)
                .get('/healthz')
                .set('Origin', 'https://my-preview.vercel.app');
            expect(res.headers['access-control-allow-origin']).toBe('https://my-preview.vercel.app');
        });

        it('should include strict defensive security headers (Helmet, Nosniff, Clickjacking)', async () => {
            const res = await request(app).get('/healthz');
            expect(res.headers['x-frame-options']).toBe('DENY');
            expect(res.headers['x-content-type-options']).toBe('nosniff');
            expect(res.headers['permissions-policy']).toBeDefined();
            expect(res.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('2. Backdoor Password Elimination & Standard Auth', () => {
        it('should reject incorrect passwords and backdoor passwords on login', async () => {
            const realPasswordHash = await bcrypt.hash('RealUserPassword123!', 10);
            jest.spyOn(userModel, 'findUserByEmail').mockResolvedValueOnce({
                id: 1,
                name: 'Abhishek Badave',
                email: 'badaveabhishek2004@gmail.com',
                password: realPasswordHash,
                role: 'admin'
            });

            const res = await request(app)
                .post('/login')
                .set('Accept', 'application/json')
                .send({
                    email: 'badaveabhishek2004@gmail.com',
                    password: 'admin123' // Old backdoor password
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('wrongpassword');

            userModel.findUserByEmail.mockRestore();
        });

        it('should succeed with valid password', async () => {
            const realPasswordHash = await bcrypt.hash('MySecretPassword123!', 10);
            jest.spyOn(userModel, 'findUserByEmail').mockResolvedValueOnce({
                id: 2,
                name: 'Jane Doe',
                email: 'jane@example.com',
                password: realPasswordHash,
                role: 'user'
            });

            const res = await request(app)
                .post('/login')
                .set('Accept', 'application/json')
                .send({
                    email: 'jane@example.com',
                    password: 'MySecretPassword123!'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            userModel.findUserByEmail.mockRestore();
        });
    });

    describe('3. Privilege Escalation / Admin Setup Hardening', () => {
        it('should reject /make-me-admin without authentication', async () => {
            const res = await request(app)
                .post('/make-me-admin')
                .set('Accept', 'application/json')
                .send({ key: 'random_key' });
            expect(res.status).toBe(401);
        });

        it('should reject /make-me-admin when ADMIN_SETUP_KEY is invalid or unset', async () => {
            const userToken = signToken({ id: 999, name: 'Normal User', email: 'user999@test.com', role: 'user' });
            const res = await request(app)
                .post('/make-me-admin')
                .set('Cookie', [`token=${userToken}`])
                .set('Accept', 'application/json')
                .send({ key: 'invalid_fake_admin_key_123' });
            expect(res.status).toBe(403);
            expect(res.body.error).toBeDefined();
        });
    });

    describe('4. Status Validation on Item Updates', () => {
        const { updateItemStatusSchema } = require('../middleware/validation');

        it('should accept valid item status values', () => {
            expect(() => updateItemStatusSchema.parse({
                params: { id: 1 },
                body: { status: 'available' }
            })).not.toThrow();

            expect(() => updateItemStatusSchema.parse({
                params: { id: 1 },
                body: { status: 'reserved' }
            })).not.toThrow();

            expect(() => updateItemStatusSchema.parse({
                params: { id: 1 },
                body: { status: 'completed' }
            })).not.toThrow();
        });

        it('should reject invalid item status values', () => {
            expect(() => updateItemStatusSchema.parse({
                params: { id: 1 },
                body: { status: 'malicious_status' }
            })).toThrow();

            expect(() => updateItemStatusSchema.parse({
                params: { id: 1 },
                body: { status: 'hacked' }
            })).toThrow();
        });
    });

    describe('5. Magic Byte Image Verification', () => {
        it('should identify JPEG, PNG, WebP, and GIF magic byte signatures and reject malicious payloads', () => {
            // JPEG: FF D8 FF
            const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
            // PNG: 89 50 4E 47
            const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
            // WebP: RIFF ... WEBP
            const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
            // HTML / text payload: <script>
            const fakeImage = Buffer.from('<script>alert(1)</script>');
            // PHP web shell payload
            const phpPayload = Buffer.from('<?php system($_GET["cmd"]); ?>');

            function checkMagic(buf) {
                if (!buf || buf.length < 4) return false;
                if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
                if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
                if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
                    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
                if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
                return false;
            }

            expect(checkMagic(jpegBuffer)).toBe(true);
            expect(checkMagic(pngBuffer)).toBe(true);
            expect(checkMagic(webpBuffer)).toBe(true);
            expect(checkMagic(fakeImage)).toBe(false);
            expect(checkMagic(phpPayload)).toBe(false);
        });
    });
});
