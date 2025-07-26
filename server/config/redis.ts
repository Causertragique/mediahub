import { createClient } from 'redis';

let redisClient: any;

export const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      retry_delay_on_failover: 100,
      retry_delay_on_cluster_down: 300,
    });

    redisClient.on('error', (error: Error) => {
      console.error('❌ Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('🔄 Connecting to Redis...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('end', () => {
      console.warn('⚠️ Redis connection ended');
    });

    await redisClient.connect();
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.warn('⚠️ Running without Redis cache');
    // Don't throw error to allow app to run without Redis
  }
};

export const getRedisClient = () => {
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis disconnected gracefully');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from Redis:', error);
  }
};

// Cache utility functions
export const setCache = async (key: string, value: any, expireInSeconds: number = 3600): Promise<void> => {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.setEx(key, expireInSeconds, JSON.stringify(value));
    }
  } catch (error) {
    console.error('❌ Cache set error:', error);
  }
};

export const getCache = async (key: string): Promise<any> => {
  try {
    if (redisClient && redisClient.isReady) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
    return null;
  } catch (error) {
    console.error('❌ Cache get error:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.del(key);
    }
  } catch (error) {
    console.error('❌ Cache delete error:', error);
  }
};