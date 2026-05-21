import { DomainException } from '@repo/common';

export class StudentLicenseNotAssignedException extends DomainException {
  readonly code = 'STUDENT_LICENSE_NOT_ASSIGNED';

  constructor(studentId: string) {
    super(`Student ${studentId} has no assigned license tier`);
  }
}
