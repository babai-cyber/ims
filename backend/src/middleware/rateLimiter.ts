import rateLimit from 'express-rate-limit';

export const signalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Slow down signal ingestion.' },
  skip: (req) => req.path === '/health', // Never rate-limit health checks
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many API requests' },
});
