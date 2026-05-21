import { DomainException } from '@repo/common';

export class UserProfileNotFoundException extends DomainException {
  readonly code = 'USER_PROFILE_NOT_FOUND';

  constructor(id: string) {
    super(`Cannot find user profile with id ${id}`);
  }
}
