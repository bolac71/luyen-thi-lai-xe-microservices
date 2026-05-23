import { DomainException } from '@repo/common';

export class EnrollmentUnauthorizedException extends DomainException {
  readonly code = 'ENROLLMENT_UNAUTHORIZED';

  constructor(enrollmentId: string) {
    super(`Current student cannot modify enrollment: ${enrollmentId}`);
  }
}
