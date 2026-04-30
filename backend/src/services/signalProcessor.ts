import { signalQueue, incrementSignalCount } from '../queue/signalQueue';
import { Signal } from '../models/Signal';
import { WorkItem } from '../models/WorkItem';
import { AlertContext } from './alerting/AlertContext';
import { redis } from '../config/db';

const DEBOUNCE_WINDOW_MS = 10 * 1000; // 10 seconds

export interface IncomingSignal {
  componentId: string;
  componentType: 'API' | 'MCP_HOST' | 'CACHE' | 'QUEUE' | 'RDBMS' | 'NOSQL';
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

// HTTP route calls this — returns immediately (non-blocking)
export async function ingestSignal(signal: IncomingSignal): Promise<void> {
  incrementSignalCount();
  await signalQueue.add('process-signal', signal, {
    priority: signal.severity === 'CRITICAL' ? 1 : signal.severity === 'HIGH' ? 2 : 3,
  });
}

// Background queue processor — 50 concurrent workers
signalQueue.process('process-signal', 50, async (job) => {
  const signal: IncomingSignal = job.data;
  const debounceKey = `debounce:${signal.componentId}`;

  const existingWorkItemId = await redis.get(debounceKey);

  if (existingWorkItemId) {
    // Debounce: link signal to existing work item
    await Signal.create({ ...signal, workItemId: existingWorkItemId, receivedAt: new Date() });
    await WorkItem.increment('signalCount', { where: { id: existingWorkItemId } });
    console.log(`[PROCESSOR] Debounced signal for WorkItem ${existingWorkItemId}`);
  } else {
    // First signal for this component in this window — create Work Item
    const alertCtx = new AlertContext(signal.componentType);

    const workItem = await WorkItem.create({
      componentId: signal.componentId,
      title: `${signal.componentType} failure on ${signal.componentId}`,
      status: 'OPEN',
      signalCount: 1,
      startTime: new Date(),
    });

    const priority = await alertCtx.executeAlert(workItem);
    await workItem.update({ priority });

    await Signal.create({ ...signal, workItemId: workItem.id, receivedAt: new Date() });

    // Set debounce key with 10s TTL
    await redis.set(debounceKey, workItem.id, 'PX', DEBOUNCE_WINDOW_MS);
    await updateDashboardCache(workItem.id);
    console.log(`[PROCESSOR] Created WorkItem ${workItem.id} [${priority}] for ${signal.componentId}`);
  }
});

async function updateDashboardCache(workItemId: string): Promise<void> {
  const cacheKey = 'dashboard:active_incidents';
  const workItem = await WorkItem.findByPk(workItemId);
  if (!workItem) return;

  const cached = await redis.get(cacheKey);
  const incidents = cached ? JSON.parse(cached) : [];
  const existing = incidents.findIndex((i: WorkItem) => i.id === workItemId);

  if (existing >= 0) {
    incidents[existing] = workItem.toJSON();
  } else {
    incidents.unshift(workItem.toJSON());
  }

  await redis.set(cacheKey, JSON.stringify(incidents.slice(0, 100)), 'EX', 300);
}
