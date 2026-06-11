import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { GL_POSTING_QUEUE_NAME } from './gl-posting.constants';
import {
  AUDIT_LOG_QUEUE_NAME,
  NOTIFICATION_QUEUE_NAME,
} from './audit-log.constants';
import { envConfig } from '../config/env.config';

@Injectable()
export class QueueHealthService implements OnModuleInit {
  private readonly logger = new Logger(QueueHealthService.name);
  private redis: Redis | null = null;

  constructor(
    @InjectQueue(GL_POSTING_QUEUE_NAME) private readonly glPostingQueue: Queue,
    @InjectQueue(AUDIT_LOG_QUEUE_NAME) private readonly auditLogQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE_NAME)
    private readonly notificationQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = envConfig.redis?.host ?? 'localhost';
    const port = envConfig.redis?.port ?? 6379;
    const password = envConfig.redis?.password;
    const redisUrl =
      envConfig.redis?.url ??
      (password
        ? `redis://:${password}@${host}:${port}`
        : `redis://${host}:${port}`);
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    try {
      await this.redis.connect();
    } catch {
      this.logger.warn('Could not connect to Redis for health checks');
    }
  }

  async checkAll(): Promise<{
    redis: 'up' | 'down';
    queues: Record<string, 'up' | 'down' | 'unknown'>;
  }> {
    let redisUp = false;
    if (this.redis) {
      try {
        await this.redis.ping();
        redisUp = true;
      } catch {
        redisUp = false;
      }
    }

    const queueNames = [
      GL_POSTING_QUEUE_NAME,
      AUDIT_LOG_QUEUE_NAME,
      NOTIFICATION_QUEUE_NAME,
    ];
    const queueStatus: Record<string, 'up' | 'down' | 'unknown'> = {};

    for (const name of queueNames) {
      if (!redisUp) {
        queueStatus[name] = 'down';
        continue;
      }
      try {
        let queue: Queue;
        if (name === GL_POSTING_QUEUE_NAME) queue = this.glPostingQueue;
        else if (name === AUDIT_LOG_QUEUE_NAME) queue = this.auditLogQueue;
        else queue = this.notificationQueue;
        await queue.getWaitingCount();
        queueStatus[name] = 'up';
      } catch {
        queueStatus[name] = 'down';
      }
    }

    return { redis: redisUp ? 'up' : 'down', queues: queueStatus };
  }
}
