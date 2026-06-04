import { Injectable } from '@nestjs/common';
import { NotificationStatus } from '@prisma/notification-client';
import {
  AcademicWarningDeliveryStatus,
  NotificationRecord,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';

@Injectable()
export class RetryAcademicWarningsUseCase {
  constructor(private readonly repository: NotificationRepository) {}

  async execute(limit = 20): Promise<number> {
    const warnings = await this.repository.findWarningsDueForRetry(
      new Date(),
      limit,
    );
    let queued = 0;
    for (const warning of warnings) {
      try {
        const notification = await this.repository.createNotification({
          userId: warning.studentId,
          title: `Academic warning: ${warning.severity}`,
          body: warning.message,
          eventType: 'notification.academic-warning.retry',
          data: {
            warningId: warning.id,
            reason: warning.reason,
            severity: warning.severity,
          },
          status: NotificationStatus.DELIVERED,
          sentAt: new Date(),
          deliveredAt: new Date(),
        });
        await this.repository.updateAcademicWarningDelivery(warning.id, {
          deliveryStatus: AcademicWarningDeliveryStatus.QUEUED,
          notificationId: notification.id,
          queuedAt: new Date(),
          nextRetryAt: null,
          lastError: null,
        });
        queued += 1;
      } catch (error) {
        const attempts = warning.retryAttempts + 1;
        await this.repository.updateAcademicWarningDelivery(warning.id, {
          deliveryStatus:
            attempts >= 3
              ? AcademicWarningDeliveryStatus.FAILED
              : AcademicWarningDeliveryStatus.PENDING_RETRY,
          retryAttempts: attempts,
          lastError: (error as Error).message,
          nextRetryAt: attempts >= 3 ? null : new Date(Date.now() + 5 * 60_000),
        });
      }
    }
    return queued;
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
