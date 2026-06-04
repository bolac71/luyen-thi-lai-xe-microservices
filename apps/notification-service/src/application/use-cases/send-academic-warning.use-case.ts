import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/notification-client';
import {
  AcademicWarningDeliveryStatus,
  AcademicWarningRecord,
  NotificationRecord,
  NotificationRepository,
} from '../../domain/repositories/notification.repository';
import { NotificationDispatcher } from './notification-dispatcher.service';

export interface SendAcademicWarningInput {
  studentId: string;
  reason: string;
  severity: string;
  message: string;
  createdById: string;
  studentEmail?: string;
  warningId?: string;
  retryCount?: number;
}

@Injectable()
export class SendAcademicWarningUseCase {
  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly repository: NotificationRepository,
  ) {}

  async execute(input: SendAcademicWarningInput): Promise<{
    warning: AcademicWarningRecord;
    notifications: NotificationRecord[];
  }> {
    const warning = input.warningId
      ? this.reconstituteWarning(input)
      : await this.repository.createAcademicWarning({
          studentId: input.studentId,
          reason: input.reason,
          severity: input.severity,
          message: input.message,
          createdById: input.createdById,
        });

    const channels: NotificationType[] = [
      NotificationType.IN_APP,
      NotificationType.PUSH,
    ];
    if (input.studentEmail) channels.push(NotificationType.EMAIL);

    try {
      const notifications = await this.dispatcher.dispatch({
        eventType: 'notification.academic-warning.created',
        userId: input.studentId,
        recipientEmail: input.studentEmail,
        title: `Academic warning: ${input.severity}`,
        body: input.message,
        data: {
          warningId: warning.id,
          reason: input.reason,
          severity: input.severity,
        },
        channels,
        retryCount: input.retryCount,
      });

      await this.repository.updateAcademicWarningDelivery(warning.id, {
        deliveryStatus: AcademicWarningDeliveryStatus.QUEUED,
        notificationId: notifications[0]?.id ?? null,
        queuedAt: new Date(),
        nextRetryAt: null,
        lastError: null,
      });

      return { warning, notifications };
    } catch (error) {
      await this.repository.updateAcademicWarningDelivery(warning.id, {
        deliveryStatus: AcademicWarningDeliveryStatus.PENDING_RETRY,
        retryAttempts: (input.retryCount ?? 0) + 1,
        lastError: (error as Error).message,
        nextRetryAt: new Date(Date.now() + 5 * 60_000),
      });
      throw error;
    }
  }

  private reconstituteWarning(
    input: SendAcademicWarningInput & { warningId?: string },
  ): AcademicWarningRecord {
    const now = new Date();
    return {
      id: input.warningId ?? '',
      studentId: input.studentId,
      reason: input.reason,
      severity: input.severity,
      message: input.message,
      createdById: input.createdById,
      deliveryStatus: AcademicWarningDeliveryStatus.PENDING,
      retryAttempts: input.retryCount ?? 0,
      nextRetryAt: null,
      notificationId: null,
      lastError: null,
      queuedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }
}
