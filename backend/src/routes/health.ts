import { Router } from 'express';
import { postgres } from '../config/db';
import { redis } from '../config/db';
import { signalQueue } from '../queue/signalQueue';
import mongoose from 'mongoose';

const router = Router();

router.get('/', async (_req: any, res: any) => {
  const checks: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      postgres: 'unknown',
      mongodb: 'unknown',
      redis: 'unknown',
      queue: 'unknown',
    },
  };

  try { await postgres.authenticate(); (checks.services as Record<string,string>).postgres = 'healthy'; }
  catch { (checks.services as Record<string,string>).postgres = 'unhealthy'; checks.status = 'degraded'; }

  (checks.services as Record<string,string>).mongodb =
    mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';

  try {
    await redis.ping();
    (checks.services as Record<string,string>).redis = 'healthy';
  } catch { (checks.services as Record<string,string>).redis = 'unhealthy'; }

  const waiting = await signalQueue.getWaitingCount();
  const active = await signalQueue.getActiveCount();
  (checks.services as Record<string,string>).queue = `healthy (${waiting} waiting, ${active} active)`;

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  return res.status(httpStatus).json(checks);
});

export default router;
