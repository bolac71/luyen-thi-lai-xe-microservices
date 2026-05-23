CREATE INDEX "questions_topicId_isActive_isDeleted_idx" ON "questions"("topicId", "isActive", "isDeleted");
CREATE INDEX "questions_createdAt_idx" ON "questions"("createdAt");
CREATE INDEX "questions_licenseCategories_idx" ON "questions" USING GIN ("licenseCategories");
