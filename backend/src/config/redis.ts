// import Redis from 'ioredis';

// import dotenv from 'dotenv';
// dotenv.config();

// const redisConfig = {
//   host: process.env.REDIS_HOST || '127.0.0.1',
//   port: parseInt(process.env.REDIS_PORT || '6379', 10),
//   password: process.env.REDIS_PASSWORD || undefined,
//   maxRetriesPerRequest: null, // Disable retries to prevent blocking if Redis is down
// };

// const redisClient = new Redis(redisConfig);

// redisClient.on('connect', () => {
//   console.log('Connected to Redis successfully!');
// });

// redisClient.on('error', (err) => {
//   console.error('Redis connection error:', err);
// });

// const REDIS_CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || '3600', 10);

// export { redisClient, REDIS_CACHE_TTL };


import Redis, { RedisOptions } from 'ioredis';

import { AppSecrets } from './secrets';

export type RedisClient = Redis;

export const initializeRedis = (secrets: AppSecrets): RedisClient => {
  console.log(`Initializing Redis connection to ${secrets.REDIS_HOST}`);

  const redisConfig: RedisOptions = {
    host: secrets.REDIS_HOST,
    port: secrets.REDIS_PORT,
    password: secrets.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };

  if (secrets.REDIS_TLS_ENABLED) {
    redisConfig.tls = {
      rejectUnauthorized: false
    };
    console.log("Redis TLS is enabled.");
  }

  const redisClient: RedisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    console.log('Connected to Redis successfully!');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  return redisClient;
};