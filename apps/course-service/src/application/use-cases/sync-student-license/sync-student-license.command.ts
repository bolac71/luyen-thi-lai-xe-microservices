import { LicenseCategory } from '../../../domain/aggregates/course/course.types';

export class SyncStudentLicenseCommand {
  constructor(
    readonly studentId: string,
    readonly licenseTier: LicenseCategory,
    readonly syncedAt: Date = new Date(),
  ) {}
}
