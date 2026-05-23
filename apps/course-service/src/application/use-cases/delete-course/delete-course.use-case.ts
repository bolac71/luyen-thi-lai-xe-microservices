import { Injectable } from '@nestjs/common';
import { IUseCase } from '@repo/common';
import { CourseNotFoundException } from '../../../domain/exceptions/course-not-found.exception';
import { CourseRepository } from '../../../domain/repositories/course.repository';
import { CourseCachePort } from '../../ports/course-cache.port';
import { CourseResult } from '../shared/course.result';
import { DeleteCourseCommand } from './delete-course.command';

@Injectable()
export class DeleteCourseUseCase
  implements IUseCase<DeleteCourseCommand, CourseResult>
{
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly courseCache: CourseCachePort,
  ) {}

  async execute(command: DeleteCourseCommand): Promise<CourseResult> {
    const course = await this.courseRepository.findById(command.courseId);
    if (!course) throw new CourseNotFoundException(command.courseId);

    course.archive();
    await this.courseRepository.save(course);
    await this.courseCache.invalidateCourse(course.id);
    await this.courseCache.invalidateLists();

    return CourseResult.fromAggregate(course);
  }
}
