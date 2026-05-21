CREATE TABLE "student_license_profiles" (
    "studentId" TEXT NOT NULL,
    "licenseTier" "LicenseCategory" NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_license_profiles_pkey" PRIMARY KEY ("studentId")
);
