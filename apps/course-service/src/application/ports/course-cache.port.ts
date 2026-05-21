import {
  CourseStatus,
  LicenseCategory,
} from '../../domain/aggregates/course/course.types';
import {
  CourseResult,
  ListCoursesResult,
} from '../use-cases/shared/course.result';

export interface CourseListCacheKey {
  licenseCategory?: LicenseCategory;
  status?: CourseStatus;
  createdById?: string;
  page: number;
  size: number;
}

export abstract class CourseCachePort {
  abstract getCourse(courseId: string): Promise<CourseResult | null>;
  abstract setCourse(course: CourseResult): Promise<void>;
  abstract getCourseList(
    key: CourseListCacheKey,
  ): Promise<ListCoursesResult | null>;
  abstract setCourseList(
    key: CourseListCacheKey,
    result: ListCoursesResult,
  ): Promise<void>;
  abstract invalidateCourse(courseId: string): Promise<void>;
  abstract invalidateLists(): Promise<void>;
}
