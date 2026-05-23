import { Injectable } from '@nestjs/common';
import { IUseCase } from '@repo/common';
import { StudentLicenseProfileRepository } from '../../../domain/repositories/student-license-profile.repository';
import { SyncStudentLicenseCommand } from './sync-student-license.command';

@Injectable()
export class SyncStudentLicenseUseCase
  implements IUseCase<SyncStudentLicenseCommand, void>
{
  constructor(
    private readonly studentLicenseProfileRepository: StudentLicenseProfileRepository,
  ) {}

  async execute(command: SyncStudentLicenseCommand): Promise<void> {
    await this.studentLicenseProfileRepository.save({
      studentId: command.studentId,
      licenseTier: command.licenseTier,
      syncedAt: command.syncedAt,
    });
  }
}
