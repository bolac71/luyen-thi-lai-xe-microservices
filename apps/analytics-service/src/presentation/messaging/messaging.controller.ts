import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RecordLearningEventUseCase } from '../../application/use-cases/record-events/record-events.use-case';
import { ExamCompletedPayload } from '../../domain/repositories/learning-progress.repository';

interface StudentPayload {
  userId?: string;
  studentId?: string;
  role?: string;
}

@Controller()
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(
    private readonly recordLearningEventUseCase: RecordLearningEventUseCase,
  ) {}

  @EventPattern('identity.user.created')
  async handleUserCreated(@Payload() payload: StudentPayload): Promise<void> {
    await this.handleSafely('identity.user.created', async () => {
      if (payload.role && payload.role !== 'STUDENT') return;
      const studentId = payload.studentId ?? payload.userId;
      if (!studentId) return;
      await this.recordLearningEventUseCase.execute({
        type: 'student-created',
        studentId,
      });
    });
  }

  @EventPattern('exam.session.completed')
  async handleExamCompleted(
    @Payload() payload: ExamCompletedPayload,
  ): Promise<void> {
    await this.handleSafely('exam.session.completed', async () => {
      await this.recordLearningEventUseCase.execute({
        type: 'exam-completed',
        payload,
      });
    });
  }

  @EventPattern('course.enrollment.created')
  async handleEnrollmentCreated(
    @Payload() payload: StudentPayload,
  ): Promise<void> {
    await this.handleSafely('course.enrollment.created', async () => {
      if (!payload.studentId) return;
      await this.recordLearningEventUseCase.execute({
        type: 'enrollment-created',
        studentId: payload.studentId,
      });
    });
  }

  @EventPattern('course.enrollment.completed')
  async handleEnrollmentCompleted(
    @Payload() payload: StudentPayload,
  ): Promise<void> {
    await this.handleSafely('course.enrollment.completed', async () => {
      if (!payload.studentId) return;
      await this.recordLearningEventUseCase.execute({
        type: 'enrollment-completed',
        studentId: payload.studentId,
      });
    });
  }

  @EventPattern('course.lesson.completed')
  async handleLessonCompleted(
    @Payload() payload: StudentPayload,
  ): Promise<void> {
    await this.handleSafely('course.lesson.completed', async () => {
      if (!payload.studentId) return;
      await this.recordLearningEventUseCase.execute({
        type: 'lesson-completed',
        studentId: payload.studentId,
      });
    });
  }

  @EventPattern('course.enrollment.progress-reset')
  async handleProgressReset(@Payload() payload: StudentPayload): Promise<void> {
    await this.handleSafely('course.enrollment.progress-reset', async () => {
      if (!payload.studentId) return;
      this.logger.log(
        `Resetting analytics projection for student ${payload.studentId}`,
      );
      await this.recordLearningEventUseCase.execute({
        type: 'progress-reset',
        studentId: payload.studentId,
      });
    });
  }

  private async handleSafely(
    eventName: string,
    handler: () => Promise<void>,
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        `Failed to handle ${eventName}: ${(error as Error).message}`,
      );
    }
  }
}
