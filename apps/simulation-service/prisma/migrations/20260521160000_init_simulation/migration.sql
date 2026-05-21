CREATE TYPE "LicenseCategory" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F');
CREATE TYPE "SimulationSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

CREATE TABLE "maneuvers" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "licenseCategory" "LicenseCategory" NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "maneuvers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maneuver_checkpoints" (
  "id" TEXT NOT NULL,
  "maneuverId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instruction" TEXT NOT NULL,
  "penalty" TEXT,
  "displayOrder" INTEGER NOT NULL,
  CONSTRAINT "maneuver_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maneuver_errors" (
  "id" TEXT NOT NULL,
  "licenseCategory" "LicenseCategory" NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maneuver_errors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_sessions" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "licenseCategory" "LicenseCategory" NOT NULL,
  "status" "SimulationSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "totalScenarios" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "score" INTEGER,
  "isPassed" BOOLEAN,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "simulation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "simulation_answers" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "selectedOptionId" TEXT,
  "isCorrect" BOOLEAN,
  "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "simulation_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maneuvers_licenseCategory_isActive_displayOrder_idx" ON "maneuvers"("licenseCategory", "isActive", "displayOrder");
CREATE INDEX "maneuver_checkpoints_maneuverId_displayOrder_idx" ON "maneuver_checkpoints"("maneuverId", "displayOrder");
CREATE INDEX "maneuver_errors_licenseCategory_idx" ON "maneuver_errors"("licenseCategory");
CREATE INDEX "simulation_sessions_studentId_status_startedAt_idx" ON "simulation_sessions"("studentId", "status", "startedAt");
CREATE UNIQUE INDEX "simulation_answers_sessionId_scenarioId_key" ON "simulation_answers"("sessionId", "scenarioId");
ALTER TABLE "maneuver_checkpoints" ADD CONSTRAINT "maneuver_checkpoints_maneuverId_fkey" FOREIGN KEY ("maneuverId") REFERENCES "maneuvers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "simulation_answers" ADD CONSTRAINT "simulation_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "simulation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
