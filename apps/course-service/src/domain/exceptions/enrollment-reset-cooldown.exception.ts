import { DomainException } from '@repo/common';

export class EnrollmentResetCooldownException extends DomainException {
  readonly code = 'ENROLLMENT_RESET_COOLDOWN';

  constructor(enrollmentId: string, hoursRemaining: number) {
    super(
      `Invalid reset-learning-progress request. Cooldown active. Please wait ${hoursRemaining.toFixed(
        1,
      )} hours. (MSG104)`,
    );
  }
}
