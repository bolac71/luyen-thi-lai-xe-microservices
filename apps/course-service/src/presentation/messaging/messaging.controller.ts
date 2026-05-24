import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Public } from 'nest-keycloak-connect';
import { SyncStudentLicenseCommand } from '../../application/use-cases/sync-student-license/sync-student-license.command';
import { SyncStudentLicenseUseCase } from '../../application/use-cases/sync-student-license/sync-student-license.use-case';
import { LicenseCategory } from '../../domain/aggregates/course/course.types';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

interface StudentLicenseAssignedPayload {
  studentId: string;
  newLicenseTier: LicenseCategory;
  oldLicenseTier: LicenseCategory | null;
}

interface MediaFileDeletedPayload {
  fileId: string;
  storageKey: string;
  deletedById: string;
}

@Controller()
@Public()
export class MessagingController {
  private readonly logger = new Logger(MessagingController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncStudentLicenseUseCase: SyncStudentLicenseUseCase,
  ) {}

  @EventPattern('user.student.license-assigned')
  async handleStudentLicenseAssigned(
    @Payload() payload: StudentLicenseAssignedPayload,
  ): Promise<void> {
    this.logger.log(
      `Received user.student.license-assigned for studentId=${payload.studentId}, newLicenseTier=${payload.newLicenseTier}`,
    );
    await this.syncStudentLicenseUseCase.execute(
      new SyncStudentLicenseCommand(
        payload.studentId,
        payload.newLicenseTier,
        new Date(),
      ),
    );
  }

  @EventPattern('media.file.deleted')
  async handleMediaFileDeleted(
    @Payload() payload: MediaFileDeletedPayload,
  ): Promise<void> {
    this.logger.log(`Received media.file.deleted for fileId=${payload.fileId}`);
    try {
      // CourseMaterial is owned by Course aggregate; direct Prisma update is the
      // pragmatic choice here since there is no standalone CourseMaterialRepository.
      await this.prisma.courseMaterial.updateMany({
        where: { mediaFileId: payload.fileId },
        data: { fileUrl: null, mediaFileId: null },
      });
      this.logger.log(`Cleared materials referencing fileId=${payload.fileId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle media.file.deleted: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
