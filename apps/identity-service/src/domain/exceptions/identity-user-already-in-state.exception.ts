import { DomainException } from '@repo/common';

export class IdentityUserAlreadyInStateException extends DomainException {
  readonly code = 'IDENTITY_USER_ALREADY_IN_STATE';

  constructor(userId: string, locked: boolean) {
    super(
      `Invalid student account status for locking. User ${userId} is already ${
        locked ? 'locked' : 'unlocked'
      }. (MSG24)`,
    );
  }
}
