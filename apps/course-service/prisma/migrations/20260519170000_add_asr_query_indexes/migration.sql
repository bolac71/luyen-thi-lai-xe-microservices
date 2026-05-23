CREATE INDEX "courses_licenseCategory_status_createdAt_idx" ON "courses"("licenseCategory", "status", "createdAt");
CREATE INDEX "courses_createdById_createdAt_idx" ON "courses"("createdById", "createdAt");
CREATE INDEX "course_enrollments_studentId_status_idx" ON "course_enrollments"("studentId", "status");
