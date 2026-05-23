import { Injectable } from '@nestjs/common';
import {
  NotificationRecord,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';

@Injectable()
export class SendAcademicWarningUseCase {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(input: {
    studentId: string;
    reason: string;
    severity: string;
    message: string;
    createdById: string;
  }): Promise<NotificationRecord> {
    const warning = await this.repository.createAcademicWarning(input);
    return this.repository.createNotification({
      userId: input.studentId,
      title: `Academic warning: ${input.severity}`,
      body: input.message,
      data: {
        warningId: warning.id,
        reason: input.reason,
        severity: input.severity,
      },
      sentAt: new Date(),
    });
  }
}

@Injectable()
export class ListNotificationsUseCase {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(
    userId: string,
    page: number,
    size: number,
  ): Promise<{
    items: NotificationRecord[];
    total: number;
    page: number;
    size: number;
  }> {
    const safePage = Math.max(page, 1);
    const safeSize = Math.min(Math.max(size, 1), 100);
    const result = await this.repository.findByUser(userId, safePage, safeSize);
    return { ...result, page: safePage, size: safeSize };
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(id: string, userId: string): Promise<NotificationRecord> {
    return this.repository.markRead(id, userId);
  }
}
