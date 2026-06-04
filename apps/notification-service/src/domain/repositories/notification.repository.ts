import {
  NotificationStatus,
  NotificationType,
} from '@prisma/notification-client';

export enum AcademicWarningDeliveryStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  PENDING_RETRY = 'PENDING_RETRY',
  FAILED = 'FAILED',
  SENT = 'SENT',
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  eventType: string | null;
  title: string;
  body: string;
  data: unknown;
  status: NotificationStatus;
  retryCount: number;
  errorMessage: string | null;
  isRead: boolean;
  readAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicWarningRecord {
  id: string;
  studentId: string;
  reason: string;
  severity: string;
  message: string;
  createdById: string;
  deliveryStatus: AcademicWarningDeliveryStatus;
  retryAttempts: number;
  nextRetryAt: Date | null;
  notificationId: string | null;
  lastError: string | null;
  queuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  body: string;
  data?: unknown;
  type?: NotificationType;
  eventType?: string;
  status?: NotificationStatus;
  retryCount?: number;
  errorMessage?: string | null;
  sentAt?: Date;
  deliveredAt?: Date;
}

export interface UpdateDeliveryStatusInput {
  status: NotificationStatus;
  retryCount?: number;
  errorMessage?: string | null;
  deliveredAt?: Date | null;
}

export abstract class NotificationRepository {
  abstract createNotification(
    input: CreateNotificationInput,
  ): Promise<NotificationRecord>;

  abstract createAcademicWarning(input: {
    studentId: string;
    reason: string;
    severity: string;
    message: string;
    createdById: string;
  }): Promise<AcademicWarningRecord>;

  abstract updateAcademicWarningDelivery(
    id: string,
    input: {
      deliveryStatus: AcademicWarningDeliveryStatus;
      notificationId?: string | null;
      lastError?: string | null;
      queuedAt?: Date | null;
      nextRetryAt?: Date | null;
      retryAttempts?: number;
    },
  ): Promise<AcademicWarningRecord>;

  abstract findWarningsDueForRetry(
    now: Date,
    take: number,
  ): Promise<AcademicWarningRecord[]>;

  abstract findByUser(
    userId: string,
    page: number,
    size: number,
  ): Promise<{
    items: NotificationRecord[];
    total: number;
  }>;

  abstract markRead(id: string, userId: string): Promise<NotificationRecord>;

  abstract updateDeliveryStatus(
    id: string,
    input: UpdateDeliveryStatusInput,
  ): Promise<NotificationRecord>;
}
