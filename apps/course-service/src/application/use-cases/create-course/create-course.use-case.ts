import { Injectable } from '@nestjs/common';
import { IUseCase } from '@repo/common';
import { Course } from '../../../domain/aggregates/course/course.aggregate';
import { CourseRepository } from '../../../domain/repositories/course.repository';
import { CourseCachePort } from '../../ports/course-cache.port';
import { CourseResult } from '../shared/course.result';
import { CreateCourseCommand } from './create-course.command';

@Injectable()
export class CreateCourseUseCase
  implements IUseCase<CreateCourseCommand, CourseResult>
{
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly courseCache: CourseCachePort,
  ) {}

  async execute(command: CreateCourseCommand): Promise<CourseResult> {
    const course = Course.create({
      title: command.title,
      description: command.description,
      licenseCategory: command.licenseCategory,
      duration: command.duration,
      tuitionFee: command.tuitionFee,
      capacity: command.capacity,
      createdById: command.createdById,
      instructorIds: command.instructorIds,
      requirement: command.requirement ?? null,
    });

    await this.courseRepository.save(course);
    await this.courseCache.invalidateLists();
    return CourseResult.fromAggregate(course);
  }
}
