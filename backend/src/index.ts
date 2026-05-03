import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import client from 'prom-client';

import { postgres, connectMongo } from './config/db';
import { WorkItem } from './models/WorkItem';
import { RCA } from './models/RCA';
import signalRoutes from './routes/signals';
import workItemRoutes from './routes/workItems';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

/* =======================
   🔥 PROMETHEUS SETUP
======================= */

// Collect default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics();

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
});

const httpResponseTime = new client.Histogram({
  name: 'http_response_time_seconds',
  help: 'HTTP response time in seconds',
});

/* =======================
   🔐 SECURITY MIDDLEWARE
======================= */

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

/* =======================
   📊 METRICS MIDDLEWARE
======================= */

app.use((req, res, next) => {
  httpRequestsTotal.inc();

  const end = httpResponseTime.startTimer();

  res.on('finish', () => {
    end();
  });

  next();
});

/* =======================
   📡 ROUTES
======================= */

app.use('/api/signals', signalRoutes);
app.use('/api/work-items', workItemRoutes);
app.use('/health', healthRoutes);

// Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

/* =======================
   ❌ ERROR HANDLING
======================= */

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

/* =======================
   🚀 SERVER START
======================= */

async function start() {
  try {
    await connectMongo();
    await postgres.authenticate();
    await WorkItem.sync({ alter: true });
    await RCA.sync({ alter: true });

    console.log('[DB] PostgreSQL synced');

    app.listen(PORT, () => {
      console.log(`[SERVER] Running on http://localhost:${PORT}`);
      console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
      console.log(`[SERVER] Metrics: http://localhost:${PORT}/metrics`);
    });

  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

start();
