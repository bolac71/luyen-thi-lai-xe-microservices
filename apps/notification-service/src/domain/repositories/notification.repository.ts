import { NotificationType } from '@prisma/notification-client';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  readAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface AcademicWarningRecord {
  id: string;
  studentId: string;
  reason: string;
  severity: string;
  message: string;
  createdById: string;
  createdAt: Date;
}

export abstract class NotificationRepository {
  abstract createNotification(input: {
    userId: string;
    title: string;
    body: string;
    data?: unknown;
    type?: NotificationType;
    sentAt?: Date;
  }): Promise<NotificationRecord>;

  abstract createAcademicWarning(input: {
    studentId: string;
    reason: string;
    severity: string;
    message: string;
    createdById: string;
  }): Promise<AcademicWarningRecord>;

  abstract findByUser(
    userId: string,
    page: number,
    size: number,
  ): Promise<{
    items: NotificationRecord[];
    total: number;
  }>;

  abstract markRead(id: string, userId: string): Promise<NotificationRecord>;
}
