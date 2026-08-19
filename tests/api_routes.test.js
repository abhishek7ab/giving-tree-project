const request = require('supertest');
const app = require('../server');

describe('4. API Routes & Defensive Headers', () => {
  test('GET /api/user returns loggedIn: false when unauthenticated', async () => {
    const res = await request(app).get('/api/user');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('loggedIn', false);
  });

  test('Security response headers are properly applied on API responses', async () => {
    const res = await request(app).get('/api/user');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['permissions-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  test('POST /register rejects malformed input with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/register')
      .set('Accept', 'application/json')
      .send({ email: 'notanemail', password: '123' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /login rejects empty credentials with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/login')
      .set('Accept', 'application/json')
      .send({ email: '', password: '' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/user/update-name returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/user/update-name')
      .set('Accept', 'application/json')
      .send({ name: 'Abhishek' });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/user/change-password returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post('/api/user/change-password')
      .set('Accept', 'application/json')
      .send({ currentPassword: 'test', newPassword: 'newPassword123' });
    expect(res.statusCode).toBe(401);
  });

  afterAll(async () => {
    const db = require('../database/db');
    if (db.pool && typeof db.pool.end === 'function') {
      await db.pool.end().catch(() => {});
    }
  });
});
