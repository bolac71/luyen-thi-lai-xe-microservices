import { Injectable } from '@nestjs/common';
import { IUseCase } from '@repo/common';
import {
  ExamCompletedPayload,
  LearningProgressRepository,
} from '../../../domain/repositories/learning-progress.repository';
import { ProgressCacheService } from '../../../infrastructure/cache/progress-cache.service';

export type LearningEventCommand =
  | { type: 'student-created'; studentId: string }
  | { type: 'exam-completed'; payload: ExamCompletedPayload }
  | { type: 'enrollment-created'; studentId: string }
  | { type: 'enrollment-completed'; studentId: string }
  | { type: 'lesson-completed'; studentId: string; minutes?: number }
  | { type: 'progress-reset'; studentId: string };

@Injectable()
export class RecordLearningEventUseCase
  implements IUseCase<LearningEventCommand, void>
{
  constructor(
    private readonly repository: LearningProgressRepository,
    private readonly cache: ProgressCacheService,
  ) {}

  async execute(command: LearningEventCommand): Promise<void> {
    const studentId =
      command.type === 'exam-completed'
        ? command.payload.studentId
        : command.studentId;

    switch (command.type) {
      case 'student-created':
        await this.repository.ensureStudent(command.studentId);
        break;
      case 'exam-completed':
        await this.repository.recordExamCompleted(command.payload);
        break;
      case 'enrollment-created':
        await this.repository.recordEnrollmentCreated(command.studentId);
        break;
      case 'enrollment-completed':
        await this.repository.recordEnrollmentCompleted(command.studentId);
        break;
      case 'lesson-completed':
        await this.repository.recordLessonCompleted(
          command.studentId,
          command.minutes ?? 30,
        );
        break;
      case 'progress-reset':
        await this.repository.resetProgress(command.studentId);
        break;
    }
    await this.cache.invalidate(studentId);
  }
}
