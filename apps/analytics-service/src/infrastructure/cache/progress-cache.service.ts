import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ProgressDashboard } from '../../domain/repositories/learning-progress.repository';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class ProgressCacheService {
  private readonly ttlSeconds = 120;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(studentId: string): Promise<ProgressDashboard | null> {
    try {
      const raw = await this.redis.get(this.key(studentId));
      return raw ? (JSON.parse(raw) as ProgressDashboard) : null;
    } catch {
      return null;
    }
  }

  async set(studentId: string, dashboard: ProgressDashboard): Promise<void> {
    try {
      await this.redis.set(
        this.key(studentId),
        JSON.stringify(dashboard),
        'EX',
        this.ttlSeconds,
      );
    } catch {
      // Analytics remains available from PostgreSQL if Redis is unavailable.
    }
  }

  async invalidate(studentId: string): Promise<void> {
    try {
      await this.redis.del(this.key(studentId));
    } catch {
      // Best-effort cache invalidation.
    }
  }

  private key(studentId: string): string {
    return `analytics:progress:${studentId}`;
  }
}
