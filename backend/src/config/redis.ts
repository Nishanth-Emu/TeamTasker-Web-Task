import Redis from 'ioredis';

import dotenv from 'dotenv';
dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Disable retries to prevent blocking if Redis is down
};

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully!');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

const REDIS_CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10);

export { redisClient, REDIS_CACHE_TTL };