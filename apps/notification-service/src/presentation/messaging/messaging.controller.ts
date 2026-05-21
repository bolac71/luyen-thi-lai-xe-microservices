import { Controller } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

interface NotificationEventPayload {
  studentId?: string;
  userId?: string;
  sessionId?: string;
  licenseCategory?: string;
  isPassed?: boolean;
}

@Controller()
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(private readonly repository: NotificationRepository) {}

  @EventPattern('exam.session.passed')
  async handleExamPassed(
    @Payload() payload: NotificationEventPayload,
  ): Promise<void> {
    await this.handleSafely('exam.session.passed', async () => {
      const userId = payload.studentId ?? payload.userId;
      if (!userId) return;
      await this.repository.createNotification({
        userId,
        title: 'Exam passed',
        body: `You passed the ${payload.licenseCategory ?? ''} exam.`,
        data: payload,
        sentAt: new Date(),
      });
    });
  }

  @EventPattern('exam.session.failed')
  async handleExamFailed(
    @Payload() payload: NotificationEventPayload,
  ): Promise<void> {
    await this.handleSafely('exam.session.failed', async () => {
      const userId = payload.studentId ?? payload.userId;
      if (!userId) return;
      await this.repository.createNotification({
        userId,
        title: 'Exam failed',
        body: 'Review weak questions and try another practice exam.',
        data: payload,
        sentAt: new Date(),
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
