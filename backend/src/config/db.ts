import { Sequelize } from 'sequelize';
import mongoose from 'mongoose';
import Redis from 'ioredis';

// PostgreSQL — Source of Truth (Work Items, RCA)
export const postgres = new Sequelize(
  process.env.PG_DB || 'ims',
  process.env.PG_USER || 'ims_user',
  process.env.PG_PASS || 'ims_pass',
  {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  }
);

// MongoDB — Signal Audit Log (high volume raw data)
export const connectMongo = async (): Promise<void> => {
  await mongoose.connect(
    process.env.MONGO_URI || 'mongodb://localhost:27017/ims_signals'
  );
  console.log('[DB] MongoDB connected');
};

// Redis — Cache + Queue backing store
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

redis.on('connect', () => console.log('[Cache] Redis connected'));
redis.on('error', (err) => console.error('[Cache] Redis error:', err));
