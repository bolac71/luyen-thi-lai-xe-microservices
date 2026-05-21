import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ManeuverErrorRecord } from '../../domain/repositories/simulation.repository';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class ManeuverErrorCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(category: string): Promise<ManeuverErrorRecord[] | null> {
    try {
      const raw = await this.redis.get(this.key(category));
      return raw ? (JSON.parse(raw) as ManeuverErrorRecord[]) : null;
    } catch {
      return null;
    }
  }

  async set(category: string, items: ManeuverErrorRecord[]): Promise<void> {
    try {
      await this.redis.set(
        this.key(category),
        JSON.stringify(items),
        'EX',
        600,
      );
    } catch {
      // Fallback to PostgreSQL if Redis is unavailable.
    }
  }

  private key(category: string): string {
    return `simulation:maneuver-errors:${category}`;
  }
}
