import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { envConfig } from '../../../../config/env.config';

/**
 * TokenDenylistService — Redis-backed jti denylist for access token revocation.
 *
 * When a user logs out, their access token's jti is added to Redis with a TTL
 * equal to the remaining token lifetime. The JWT strategy checks this denylist
 * on every authenticated request and rejects denied tokens.
 *
 * Falls back to an in-memory Map when Redis is unavailable (development only).
 */
@Injectable()
export class TokenDenylistService implements OnModuleInit {
  private readonly logger = new Logger(TokenDenylistService.name);
  private redis: Redis | null = null;
  private readonly fallbackStore = new Map<string, number>(); // jti -> expiry timestamp
  private readonly KEY_PREFIX = 'denylist:jti:';

  async onModuleInit(): Promise<void> {
    const host = envConfig.redis?.host ?? 'localhost';
    const port = envConfig.redis?.port ?? 6379;
    const password = envConfig.redis?.password;
    const redisUrl =
      envConfig.redis?.url ??
      (password
        ? `redis://:${password}@${host}:${port}`
        : `redis://${host}:${port}`);

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      });
      await this.redis.connect();
      this.logger.log('Redis connected for token denylist');
    } catch {
      this.redis = null;
      this.logger.warn(
        'Could not connect to Redis for token denylist — using in-memory fallback (not suitable for production)',
      );
    }
  }

  /**
   * Add a jti to the denylist with the given TTL (in seconds).
   */
  async deny(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return;
    const ttl = Math.max(1, Math.ceil(ttlSeconds));

    if (this.redis) {
      try {
        await this.redis.set(`${this.KEY_PREFIX}${jti}`, '1', 'EX', ttl);
        return;
      } catch (err: any) {
        this.logger.warn(
          `Redis deny SET failed, falling back to in-memory: ${err?.message}`,
        );
      }
    }

    // In-memory fallback
    this.fallbackStore.set(jti, Date.now() + ttl * 1000);
    this.cleanupFallback();
  }

  /**
   * Check if a jti is in the denylist.
   */
  async isDenied(jti: string): Promise<boolean> {
    if (!jti) return false;

    if (this.redis) {
      try {
        const result = await this.redis.exists(`${this.KEY_PREFIX}${jti}`);
        return result === 1;
      } catch (err: any) {
        this.logger.warn(
          `Redis deny GET failed, falling back to in-memory: ${err?.message}`,
        );
      }
    }

    // In-memory fallback
    const expiry = this.fallbackStore.get(jti);
    if (expiry === undefined) return false;
    if (Date.now() >= expiry) {
      this.fallbackStore.delete(jti);
      return false;
    }
    return true;
  }

  /**
   * Remove expired entries from the in-memory fallback store.
   */
  private cleanupFallback(): void {
    const now = Date.now();
    for (const [jti, expiry] of this.fallbackStore) {
      if (now >= expiry) {
        this.fallbackStore.delete(jti);
      }
    }
  }
}
