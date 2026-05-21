import { DomainException } from '@repo/common';
import { LicenseCategory } from '../aggregates/course/course.types';

export class StudentLicenseMismatchException extends DomainException {
  readonly code = 'STUDENT_LICENSE_MISMATCH';

  constructor(
    studentId: string,
    assignedTier: LicenseCategory,
    courseCategory: LicenseCategory,
  ) {
    super(
      `Student ${studentId} has license tier ${assignedTier}, but course requires ${courseCategory}`,
    );
  }
}
