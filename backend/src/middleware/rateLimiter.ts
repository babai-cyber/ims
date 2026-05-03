import rateLimit from 'express-rate-limit';
import client from 'prom-client';

/* =======================
   📊 PROMETHEUS METRIC
======================= */

// Count how many requests are rate limited
const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of requests blocked by rate limiter',
  labelNames: ['route'],
});

/* =======================
   🚦 SIGNAL RATE LIMITER
======================= */

export const signalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Slow down signal ingestion.' },

  skip: (req) => req.path === '/health',

  handler: (req, res) => {
    // 🔥 Increment metric when limit exceeded
    rateLimitHits.inc({ route: req.path });

    res.status(429).json({
      error: 'Rate limit exceeded. Slow down signal ingestion.',
    });
  },
});

/* =======================
   🚦 API RATE LIMITER
======================= */

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,

  handler: (req, res) => {
    // 🔥 Track blocked API calls
    rateLimitHits.inc({ route: req.path });

    res.status(429).json({
      error: 'Too many API requests',
    });
  },
});
