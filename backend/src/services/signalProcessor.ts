import { signalQueue, incrementSignalCount } from '../queue/signalQueue';
import { Signal } from '../models/Signal';
import { WorkItem } from '../models/WorkItem';
import { AlertContext } from './alerting/AlertContext';
import { redis } from '../config/db';

const DEBOUNCE_WINDOW_MS = 10 * 1000;

export interface IncomingSignal {
  componentId: string;
  componentType: 'API' | 'MCP_HOST' | 'CACHE' | 'QUEUE' | 'RDBMS' | 'NOSQL';
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

// 🚀 API ingestion
export async function ingestSignal(signal: IncomingSignal): Promise<void> {
  incrementSignalCount();
  await signalQueue.add('process-signal', signal, {
    priority:
      signal.severity === 'CRITICAL'
        ? 1
        : signal.severity === 'HIGH'
        ? 2
        : 3,
  });
}

// 🔥 MAIN PROCESSOR
signalQueue.process('process-signal', 50, async (job: any) => {
  const signal: IncomingSignal = job.data;
  const debounceKey = `debounce:${signal.componentId}`;
  const lockKey = `lock:${signal.componentId}`;
  const now = new Date();

  let workItem: any = null;

  // 🔹 1. Try Redis debounce
  try {
    const workItemId = await redis.get(debounceKey);
    if (workItemId) {
      workItem = await WorkItem.findByPk(workItemId);
    }
  } catch {
    console.log('[WARN] Redis unavailable');
  }

  // 🔹 2. DB fallback
  if (!workItem) {
    workItem = await WorkItem.findOne({
      where: {
        componentId: signal.componentId,
        status: 'OPEN',
      },
      order: [['createdAt', 'DESC']],
    });
  }

  // 🔹 3. LOCK (prevents duplicates)
  if (!workItem) {
    try {
      const lockAcquired = await redis.setnx(lockKey, '1');

      if (lockAcquired) {
        // set expiry manually
        await redis.pexpire(lockKey, 5000);

        // ✅ Only ONE worker creates
        const alertCtx = new AlertContext(signal.componentType);

        workItem = await WorkItem.create({
          componentId: signal.componentId,
          title: `${signal.componentType} failure on ${signal.componentId}`,
          status: 'OPEN',
          signalCount: 0,
          startTime: now,
        });

        const priority = await alertCtx.executeAlert(workItem);
        await workItem.update({ priority });

        console.log(`[LOCK] Created WorkItem ${workItem.id}`);
      } else {
        // ⏳ Wait and fetch existing
        await new Promise(res => setTimeout(res, 100));

        workItem = await WorkItem.findOne({
          where: {
            componentId: signal.componentId,
            status: 'OPEN',
          },
          order: [['createdAt', 'DESC']],
        });
      }
    } catch {
      console.log('[WARN] Lock failed');
    }
  }

  // 🔴 Safety check
  if (!workItem) {
    throw new Error('WorkItem creation failed');
  }

  // 🔹 4. Store signal
  await Signal.create({
    ...signal,
    workItemId: workItem.id,
    receivedAt: now,
  });

  // 🔹 5. Increment count
  await WorkItem.increment('signalCount', {
    by: 1,
    where: { id: workItem.id },
  });

  // 🔹 6. Set debounce key
  try {
    await redis.set(debounceKey, workItem.id);
    await redis.pexpire(debounceKey, DEBOUNCE_WINDOW_MS);
  } catch {
    console.log('[WARN] Redis set failed');
  }

  await updateDashboardCache(workItem.id);

  console.log(`[PROCESSOR] Signal linked to WorkItem ${workItem.id}`);
});

// 📊 Dashboard cache
async function updateDashboardCache(workItemId: string): Promise<void> {
  try {
    const cacheKey = 'dashboard:active_incidents';

    const workItem = await WorkItem.findByPk(workItemId);
    if (!workItem) return;

    const cached = await redis.get(cacheKey);
    const incidents = cached ? JSON.parse(cached) : [];

    const index = incidents.findIndex((i: any) => i.id === workItemId);

    if (index >= 0) {
      incidents[index] = workItem.toJSON();
    } else {
      incidents.unshift(workItem.toJSON());
    }

    await redis.set(cacheKey, JSON.stringify(incidents.slice(0, 100)));
    await redis.expire(cacheKey, 300);
  } catch {
    console.log('[WARN] Cache update failed');
  }
}
