ALTER TABLE "exam_sessions"
  ADD COLUMN "templateNameSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "templateVersionSnapshot" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "licenseCategorySnapshot" "LicenseCategory" NOT NULL DEFAULT 'B1',
  ADD COLUMN "totalQuestionsSnapshot" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "passingScoreSnapshot" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "durationMinutesSnapshot" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "criticalQuestionsSnapshot" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "topicDistributionSnapshot" JSONB NOT NULL DEFAULT '[]';

CREATE INDEX "exam_sessions_startedAt_isPassed_idx" ON "exam_sessions"("startedAt", "isPassed");
