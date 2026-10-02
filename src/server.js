const express = require('express');
const client = require('prom-client');
const { isValidTask } = require('./validation');

const app = express();
app.use(express.json());

// Prometheus Metrics Setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status_code']
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    httpRequestsTotal.inc({ method: 'GET', route: '/health', status_code: 200 });
    res.status(200).json({ status: 'UP' });
});

// Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

// Mock Database
let tasks = [];

// Task Routes
app.get('/api/tasks', (req, res) => {
    httpRequestsTotal.inc({ method: 'GET', route: '/api/tasks', status_code: 200 });
    res.status(200).json(tasks);
});

app.post('/api/tasks', (req, res) => {
    const task = req.body;
    
    if (!isValidTask(task)) {
        httpRequestsTotal.inc({ method: 'POST', route: '/api/tasks', status_code: 400 });
        return res.status(400).json({ error: 'Task must have a valid title' });
    }

    const newTask = { id: tasks.length + 1, title: task.title.trim() };
    tasks.push(newTask);
    
    httpRequestsTotal.inc({ method: 'POST', route: '/api/tasks', status_code: 201 });
    res.status(201).json(newTask);
});

// Only start the server if run directly (allows Jest to import app without binding port)
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Task Management API running on port ${PORT}`);
    });
}

module.exports = app;