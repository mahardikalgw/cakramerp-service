import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { envConfig } from '../../../../config/env.config';

@Injectable()
export class QueueHealthIndicatorService {
  private readonly logger = new Logger(QueueHealthIndicatorService.name);

  async isRedisHealthy(): Promise<boolean> {
    const redisConfig = envConfig.redis;
    const url =
      redisConfig?.url ??
      `redis://${redisConfig?.host ?? 'localhost'}:${redisConfig?.port ?? 6379}`;
    const password = redisConfig?.password;

    try {
      const client = new Redis(url, {
        ...(password ? { password } : {}),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });
      await client.ping();
      await client.quit();
      return true;
    } catch (error) {
      this.logger.warn(`Redis health check failed: ${String(error)}`);
      return false;
    }
  }
}
