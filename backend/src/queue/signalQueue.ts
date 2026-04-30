import Bull from 'bull';

export const signalQueue = new Bull('signal-processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Throughput tracking
let signalCount = 0;
export const incrementSignalCount = (): void => { signalCount++; };

setInterval(async () => {
  const waiting = await signalQueue.getWaitingCount();
  const active = await signalQueue.getActiveCount();
  const failed = await signalQueue.getFailedCount();
  console.log(`[METRICS] Signals/5s: ${signalCount} (~${Math.round(signalCount/5)}/sec) | Queue: ${waiting} waiting, ${active} active, ${failed} failed`);
  signalCount = 0;
}, 5000);

signalQueue.on('failed', (job, err) => {
  console.error(`[QUEUE] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});
