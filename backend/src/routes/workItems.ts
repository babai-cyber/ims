import { Router } from 'express';
import { WorkItem } from '../models/WorkItem';
import { WorkItemStateMachine } from '../services/workItem/WorkItemStateMachine';
import { RCA } from '../models/RCA';
import { Signal } from '../models/Signal';
import { redis } from '../config/db';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(apiRateLimiter);

// GET /api/work-items
router.get('/', async (req: any, res: any) => {
  try {
    const { status } = req.query;
    if (!status) {
      const cached = await redis.get('dashboard:active_incidents');
      if (cached) return res.json({ source: 'cache', data: JSON.parse(cached) });
    }

    const where = status ? { status } : {};
    const items = await WorkItem.findAll({ where, order: [['startTime', 'DESC']] });
    return res.json({ source: 'db', data: items });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// GET /api/work-items/:id
router.get('/:id', async (req: any, res: any) => {
  try {
    const workItem = await WorkItem.findByPk(req.params.id);
    if (!workItem) return res.status(404).json({ error: 'Not found' });

    const signals = await Signal.find({ workItemId: req.params.id })
      .sort({ receivedAt: -1 })
      .limit(100);

    const rca = await RCA.findOne({ where: { workItemId: req.params.id } });
    return res.json({ workItem, signals, rca });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// PATCH /api/work-items/:id/status
router.patch('/:id/status', async (req: any, res: any) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const workItem = await WorkItemStateMachine.transition(req.params.id, status);
    return res.json({ workItem });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// POST /api/work-items/:id/rca
router.post('/:id/rca', async (req: any, res: any) => {
  try {
    const { incidentStart, incidentEnd, rootCauseCategory, fixApplied, preventionSteps } = req.body;
    if (!incidentStart || !incidentEnd || !rootCauseCategory || !fixApplied || !preventionSteps) {
      return res.status(400).json({ error: 'All RCA fields are required' });
    }

    const workItem = await WorkItem.findByPk(req.params.id);
    if (!workItem) return res.status(404).json({ error: 'Work item not found' });
    if (workItem.status !== 'RESOLVED') {
      return res.status(400).json({ error: 'RCA can only be submitted for RESOLVED incidents' });
    }

    const [rca] = await RCA.upsert({
      workItemId: req.params.id,
      incidentStart: new Date(incidentStart),
      incidentEnd: new Date(incidentEnd),
      rootCauseCategory,
      fixApplied,
      preventionSteps,
    });

    return res.json({ rca, message: 'RCA saved. You can now close the incident.' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
