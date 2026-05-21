CREATE INDEX "exam_sessions_studentId_startedAt_idx" ON "exam_sessions"("studentId", "startedAt");
CREATE INDEX "exam_sessions_studentId_isPassed_startedAt_idx" ON "exam_sessions"("studentId", "isPassed", "startedAt");
