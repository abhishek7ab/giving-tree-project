const request = require('supertest');
const app = require('../server');
const { signToken } = require('../config/jwt');
const auditModel = require('../models/auditModel');
const db = require('../database/db');

describe('Admin Access Security & Audit Logging Tests', () => {

    const userToken = signToken({ id: 50, name: 'Normal User', email: 'user50@example.com', role: 'user' });
    const adminToken = signToken({ id: 1, name: 'Abhishek Admin', email: 'badaveabhishek2004@gmail.com', role: 'admin' });
    const secondaryAdminToken = signToken({ id: 2, name: 'Secondary Admin', email: 'secadmin@example.com', role: 'admin' });

    describe('1. Non-Admin Blocking on Administrative Routes', () => {
        it('should block unauthenticated requests to /api/admin/data', async () => {
            const res = await request(app)
                .get('/api/admin/data')
                .set('Accept', 'application/json');
            expect(res.status).toBe(401);
        });

        it('should block normal users from /api/admin/data (403 Forbidden)', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    return {
                        rows: [{ id: 50, name: 'Normal User', email: 'user50@example.com', role: 'user', archived_at: null }]
                    };
                }
                return { rows: [] };
            });

            const res = await request(app)
                .get('/api/admin/data')
                .set('Cookie', [`token=${userToken}`])
                .set('Accept', 'application/json');
            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Admin access required');

            db.query.mockRestore();
        });

        it('should block normal users from /api/admin/audit-logs', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    return {
                        rows: [{ id: 50, name: 'Normal User', email: 'user50@example.com', role: 'user', archived_at: null }]
                    };
                }
                return { rows: [] };
            });

            const res = await request(app)
                .get('/api/admin/audit-logs')
                .set('Cookie', [`token=${userToken}`])
                .set('Accept', 'application/json');
            expect(res.status).toBe(403);

            db.query.mockRestore();
        });

        it('should block normal users from /admin/delete-item', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    return {
                        rows: [{ id: 50, name: 'Normal User', email: 'user50@example.com', role: 'user', archived_at: null }]
                    };
                }
                return { rows: [] };
            });

            const res = await request(app)
                .post('/admin/delete-item')
                .set('Cookie', [`token=${userToken}`])
                .set('Accept', 'application/json')
                .send({ id: 10 });
            expect(res.status).toBe(403);

            db.query.mockRestore();
        });
    });

    describe('2. Live Database Role Verification (Revocation Defense)', () => {
        it('should reject requests if admin was archived/deactivated in database', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    return {
                        rows: [{ id: 2, name: 'Demoted Admin', email: 'secadmin@example.com', role: 'admin', archived_at: new Date() }]
                    };
                }
                return { rows: [] };
            });

            const res = await request(app)
                .get('/api/admin/data')
                .set('Cookie', [`token=${secondaryAdminToken}`])
                .set('Accept', 'application/json');
            expect(res.status).toBe(401);

            db.query.mockRestore();
        });

        it('should reject requests if admin was demoted to user in database', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    return {
                        rows: [{ id: 2, name: 'Demoted Admin', email: 'secadmin@example.com', role: 'user', archived_at: null }]
                    };
                }
                return { rows: [] };
            });

            const res = await request(app)
                .get('/api/admin/data')
                .set('Cookie', [`token=${secondaryAdminToken}`])
                .set('Accept', 'application/json');
            expect(res.status).toBe(403);

            db.query.mockRestore();
        });
    });

    describe('3. Admin Lockout & Master Protection', () => {
        it('should prevent admin from deleting their own active admin account', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    return {
                        rows: [{ id: 1, name: 'Abhishek Admin', email: 'badaveabhishek2004@gmail.com', role: 'admin', archived_at: null }]
                    };
                }
                return { rows: [] };
            });

            const res = await request(app)
                .post('/admin/delete-user')
                .set('Cookie', [`token=${adminToken}`])
                .set('Accept', 'application/json')
                .send({ id: 1, confirmDelete: 'yes' }); // Trying to delete own ID 1

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('You cannot delete your own admin account');

            db.query.mockRestore();
        });

        it('should prevent secondary admins from deleting the master admin account', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql, params) => {
                if (typeof sql === 'string' && sql.includes('FROM users WHERE id = $1')) {
                    const id = params ? params[0] : null;
                    if (id === 2) {
                        return {
                            rows: [{ id: 2, name: 'Secondary Admin', email: 'secadmin@example.com', role: 'admin', archived_at: null }]
                        };
                    }
                    if (id === 1) {
                        return {
                            rows: [{ id: 1, name: 'Master Admin', email: 'badaveabhishek2004@gmail.com', role: 'admin', archived_at: null }]
                        };
                    }
                }
                return { rows: [] };
            });

            const res = await request(app)
                .post('/admin/delete-user')
                .set('Cookie', [`token=${secondaryAdminToken}`])
                .set('Accept', 'application/json')
                .send({ id: 1, confirmDelete: 'yes' }); // Target is Master Admin ID 1

            expect(res.status).toBe(403);
            expect(res.body.error).toContain('Master Admin account cannot be deleted');

            db.query.mockRestore();
        });
    });

    describe('4. Security Audit Logging Model', () => {
        it('should format and log audit events without throwing errors', async () => {
            jest.spyOn(db, 'query').mockImplementation(async (sql) => {
                if (typeof sql === 'string' && sql.includes('INSERT INTO audit_logs')) {
                    return {
                        rows: [{
                            id: 101,
                            user_id: 1,
                            user_email: 'badaveabhishek2004@gmail.com',
                            action: 'ADMIN_DELETE_ITEM',
                            details: '{"itemId":5}',
                            ip_address: '127.0.0.1',
                            created_at: new Date()
                        }]
                    };
                }
                return { rows: [] };
            });

            const logged = await auditModel.logEvent({
                userId: 1,
                userEmail: 'badaveabhishek2004@gmail.com',
                action: 'ADMIN_DELETE_ITEM',
                details: { itemId: 5 },
                req: { headers: { 'user-agent': 'Jest-Test-Agent' }, socket: { remoteAddress: '127.0.0.1' } }
            });

            expect(logged).toBeDefined();
            expect(logged.action).toBe('ADMIN_DELETE_ITEM');

            db.query.mockRestore();
        });
    });
});
