CREATE TYPE "NotificationType" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS');

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'IN_APP',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academic_warnings" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academic_warnings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX "academic_warnings_studentId_createdAt_idx" ON "academic_warnings"("studentId", "createdAt");
