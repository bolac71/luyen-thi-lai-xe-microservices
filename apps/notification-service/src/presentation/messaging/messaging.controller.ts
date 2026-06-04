import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { SendAcademicWarningUseCase } from '../../application/use-cases/send-academic-warning.use-case';
import { SendCourseUpdateUseCase } from '../../application/use-cases/send-course-update.use-case';
import { SendExamResultUseCase } from '../../application/use-cases/send-exam-result.use-case';
import { SendPasswordResetUseCase } from '../../application/use-cases/send-password-reset.use-case';
import { SendWelcomeEmailUseCase } from '../../application/use-cases/send-welcome-email.use-case';
import { NotificationMetrics } from '../../infrastructure/metrics/notification.metrics';

interface RetryablePayload {
  retryCount?: number;
}

interface IdentityUserCreatedPayload extends RetryablePayload {
  userId: string;
  email: string;
  fullName?: string;
}

interface PasswordResetRequestedPayload extends RetryablePayload {
  userId: string;
  email: string;
  resetUrl: string;
}

interface ExamSessionPayload extends RetryablePayload {
  studentId?: string;
  userId?: string;
  email?: string;
  sessionId?: string;
  licenseCategory?: string;
  score?: number;
}

interface AcademicWarningQueuedPayload extends RetryablePayload {
  studentId: string;
  reason: string;
  severity: string;
  message: string;
  createdById: string;
  studentEmail?: string;
  warningId?: string;
}

interface CourseUpdatedPayload extends RetryablePayload {
  recipientId: string;
  recipientEmail?: string;
  courseId: string;
  courseTitle: string;
  updateSummary: string;
}

@Controller()
export class MessagingController {
  constructor(
    private readonly sendWelcomeEmailUseCase: SendWelcomeEmailUseCase,
    private readonly sendExamResultUseCase: SendExamResultUseCase,
    private readonly sendAcademicWarningUseCase: SendAcademicWarningUseCase,
    private readonly sendPasswordResetUseCase: SendPasswordResetUseCase,
    private readonly sendCourseUpdateUseCase: SendCourseUpdateUseCase,
    private readonly metrics: NotificationMetrics,
  ) {}

  @EventPattern('identity.user.created')
  async handleUserCreated(
    @Payload() payload: IdentityUserCreatedPayload,
  ): Promise<void> {
    this.metrics.recordConsumed('identity.user.created');
    if (!payload.userId || !payload.email) return;
    await this.sendWelcomeEmailUseCase.execute({
      userId: payload.userId,
      email: payload.email,
      fullName: payload.fullName,
      retryCount: payload.retryCount,
    });
  }

  @EventPattern('identity.user.password-reset-requested')
  async handlePasswordReset(
    @Payload() payload: PasswordResetRequestedPayload,
  ): Promise<void> {
    this.metrics.recordConsumed('identity.user.password-reset-requested');
    if (!payload.userId || !payload.email || !payload.resetUrl) return;
    await this.sendPasswordResetUseCase.execute({
      userId: payload.userId,
      email: payload.email,
      resetUrl: payload.resetUrl,
      retryCount: payload.retryCount,
    });
  }

  @EventPattern('exam.session.passed')
  async handleExamPassed(
    @Payload() payload: ExamSessionPayload,
  ): Promise<void> {
    this.metrics.recordConsumed('exam.session.passed');
    const userId = payload.studentId ?? payload.userId;
    if (!userId) return;
    await this.sendExamResultUseCase.execute({
      eventType: 'exam.session.passed',
      userId,
      email: payload.email,
      licenseCategory: payload.licenseCategory,
      sessionId: payload.sessionId,
      score: payload.score,
      retryCount: payload.retryCount,
    });
  }

  @EventPattern('exam.session.failed')
  async handleExamFailed(
    @Payload() payload: ExamSessionPayload,
  ): Promise<void> {
    this.metrics.recordConsumed('exam.session.failed');
    const userId = payload.studentId ?? payload.userId;
    if (!userId) return;
    await this.sendExamResultUseCase.execute({
      eventType: 'exam.session.failed',
      userId,
      email: payload.email,
      licenseCategory: payload.licenseCategory,
      sessionId: payload.sessionId,
      score: payload.score,
      retryCount: payload.retryCount,
    });
  }

  @EventPattern('notification.academic-warning.queued')
  async handleAcademicWarningQueued(
    @Payload() payload: AcademicWarningQueuedPayload,
  ): Promise<void> {
    this.metrics.recordConsumed('notification.academic-warning.queued');
    await this.sendAcademicWarningUseCase.execute({
      studentId: payload.studentId,
      reason: payload.reason,
      severity: payload.severity,
      message: payload.message,
      createdById: payload.createdById,
      studentEmail: payload.studentEmail,
      warningId: payload.warningId,
      retryCount: payload.retryCount,
    });
  }

  @EventPattern('course.updated')
  async handleCourseUpdated(
    @Payload() payload: CourseUpdatedPayload,
  ): Promise<void> {
    this.metrics.recordConsumed('course.updated');
    if (!payload.recipientId) return;
    await this.sendCourseUpdateUseCase.execute({
      userId: payload.recipientId,
      email: payload.recipientEmail,
      courseId: payload.courseId,
      courseTitle: payload.courseTitle,
      updateSummary: payload.updateSummary,
      retryCount: payload.retryCount,
    });
  }
}
