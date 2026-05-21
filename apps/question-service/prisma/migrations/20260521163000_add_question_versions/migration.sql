CREATE TABLE "question_versions" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "type" "QuestionType" NOT NULL,
  "licenseCategories" "LicenseCategory"[],
  "difficulty" "QuestionDifficulty" NOT NULL,
  "explanation" TEXT NOT NULL,
  "imageUrl" TEXT,
  "mediaFileId" TEXT,
  "isCritical" BOOLEAN NOT NULL,
  "isActive" BOOLEAN NOT NULL,
  "topicId" TEXT NOT NULL,
  "optionsSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_versions_questionId_version_key" ON "question_versions"("questionId", "version");
CREATE INDEX "question_versions_questionId_createdAt_idx" ON "question_versions"("questionId", "createdAt");
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
