import { LicenseCategory } from '../aggregates/course/course.types';

export interface StudentLicenseProfile {
  studentId: string;
  licenseTier: LicenseCategory;
  syncedAt: Date;
}

export abstract class StudentLicenseProfileRepository {
  abstract findByStudentId(
    studentId: string,
  ): Promise<StudentLicenseProfile | null>;
  abstract save(profile: StudentLicenseProfile): Promise<void>;
}
