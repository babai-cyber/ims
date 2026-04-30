import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { postgres, connectMongo } from './config/db';
import { WorkItem } from './models/WorkItem';
import { RCA } from './models/RCA';
import signalRoutes from './routes/signals';
import workItemRoutes from './routes/workItems';
import healthRoutes from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware (OWASP A05 - Security Misconfiguration)
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' })); // Limit body size (OWASP A04)

// Routes
app.use('/api/signals', signalRoutes);
app.use('/api/work-items', workItemRoutes);
app.use('/health', healthRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler (OWASP A09 - Security Logging)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

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
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

start();
