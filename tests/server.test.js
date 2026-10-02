const request = require('supertest');
const app = require('../src/server'); 

describe('Task Management API Tests', () => {
    it('GET /health returns status UP', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ status: 'UP' });
    });

    it('GET /metrics exposes Prometheus telemetry', async () => {
        const res = await request(app).get('/metrics');
        expect(res.statusCode).toBe(200);
        expect(res.text).toMatch(/http_requests_total/);
    });

    it('GET /api/tasks lists all tasks', async () => {
        const res = await request(app).get('/api/tasks');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/tasks creates a new task', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .send({ title: 'Learn Docker' });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('Learn Docker');
    });

    it('POST /api/tasks fails without a title', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .send({ description: 'Missing title' });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});