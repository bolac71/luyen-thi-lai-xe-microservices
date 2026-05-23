import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import {
  CourseCachePort,
  CourseListCacheKey,
} from '../../application/ports/course-cache.port';
import {
  CourseResult,
  ListCoursesResult,
} from '../../application/use-cases/shared/course.result';

export const REDIS_CLIENT = 'COURSE_REDIS_CLIENT';

@Injectable()
export class RedisCourseCacheService extends CourseCachePort {
  private readonly logger = new Logger(RedisCourseCacheService.name);
  private readonly ttlSeconds = 600;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async getCourse(courseId: string): Promise<CourseResult | null> {
    return this.getJson<CourseResult>(this.courseKey(courseId));
  }

  async setCourse(course: CourseResult): Promise<void> {
    await this.setJson(this.courseKey(course.id), course);
  }

  async getCourseList(
    key: CourseListCacheKey,
  ): Promise<ListCoursesResult | null> {
    return this.getJson<ListCoursesResult>(this.listKey(key));
  }

  async setCourseList(
    key: CourseListCacheKey,
    result: ListCoursesResult,
  ): Promise<void> {
    await this.setJson(this.listKey(key), result);
  }

  async invalidateCourse(courseId: string): Promise<void> {
    await this.safeExec(() => this.redis.del(this.courseKey(courseId)));
    await this.invalidateLists();
  }

  async invalidateLists(): Promise<void> {
    await this.deleteByPattern('course:list:*');
  }

  private async getJson<T>(key: string): Promise<T | null> {
    return this.safeExec(async () => {
      const value = await this.redis.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }, null);
  }

  private async setJson(key: string, value: unknown): Promise<void> {
    await this.safeExec(() =>
      this.redis.set(key, JSON.stringify(value), 'EX', this.ttlSeconds),
    );
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    await this.safeExec(async () => {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== '0');
    });
  }

  private async safeExec<T>(
    operation: () => Promise<T>,
    fallback?: T,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(
        `Course cache skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
      return fallback as T;
    }
  }

  private courseKey(courseId: string): string {
    return `course:detail:${courseId}`;
  }

  private listKey(key: CourseListCacheKey): string {
    return [
      'course:list',
      key.licenseCategory ?? 'all',
      key.status ?? 'all',
      key.createdById ?? 'all',
      key.page,
      key.size,
    ].join(':');
  }
}
