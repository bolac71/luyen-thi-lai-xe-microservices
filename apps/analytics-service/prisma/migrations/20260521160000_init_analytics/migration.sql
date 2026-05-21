CREATE TABLE "student_learning_profiles" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "totalStudyMinutes" INTEGER NOT NULL DEFAULT 0,
  "totalExamAttempts" INTEGER NOT NULL DEFAULT 0,
  "passedExams" INTEGER NOT NULL DEFAULT 0,
  "avgExamScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "coursesEnrolled" INTEGER NOT NULL DEFAULT 0,
  "coursesCompleted" INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3),
  "resetAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_learning_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_activities" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "studyMinutes" INTEGER NOT NULL DEFAULT 0,
  "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
  "correctAnswers" INTEGER NOT NULL DEFAULT 0,
  "examsAttempted" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "question_accuracy_trackers" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "topicId" TEXT,
  "topicName" TEXT,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "correctAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_accuracy_trackers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_learning_profiles_studentId_key" ON "student_learning_profiles"("studentId");
CREATE UNIQUE INDEX "daily_activities_studentId_date_key" ON "daily_activities"("studentId", "date");
CREATE INDEX "daily_activities_studentId_date_idx" ON "daily_activities"("studentId", "date");
CREATE UNIQUE INDEX "question_accuracy_trackers_studentId_questionId_key" ON "question_accuracy_trackers"("studentId", "questionId");
CREATE INDEX "question_accuracy_trackers_studentId_lastAttemptAt_idx" ON "question_accuracy_trackers"("studentId", "lastAttemptAt");
