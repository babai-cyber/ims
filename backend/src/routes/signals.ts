import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { ingestSignal } from '../services/signalProcessor';
import { signalRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const COMPONENT_TYPES = ['API', 'MCP_HOST', 'CACHE', 'QUEUE', 'RDBMS', 'NOSQL'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// POST /api/signals
router.post(
  '/',
  signalRateLimiter,
  [
    body('componentId').notEmpty().trim().escape(),
    body('componentType').isIn(COMPONENT_TYPES),
    body('severity').optional().isIn(SEVERITIES),
    body('latencyMs').optional().isNumeric(),
  ],
  async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { componentId, componentType, errorCode, errorMessage, latencyMs, severity, metadata } = req.body;
      await ingestSignal({ componentId, componentType, errorCode, errorMessage, latencyMs, severity, metadata });
      return res.status(202).json({ message: 'Signal accepted for processing' });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }
);

export default router;
