import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LicenseCategory,
  SimulationSessionStatus,
} from '@prisma/simulation-client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  ManeuverErrorRecord,
  ManeuverRecord,
  SimulationSessionRecord,
} from '../../domain/repositories/simulation.repository';

export class LicenseCategoryQueryDto {
  @ApiProperty({ enum: LicenseCategory })
  @IsEnum(LicenseCategory)
  licenseCategory!: LicenseCategory;
}

export class StartSimulationSessionRequestDto {
  @ApiProperty({ enum: LicenseCategory })
  @IsEnum(LicenseCategory)
  licenseCategory!: LicenseCategory;
}

export class SaveSimulationAnswerRequestDto {
  @ApiProperty()
  @IsUUID()
  scenarioId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedOptionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean | null;
}

export class ManeuverResponseDto {
  static fromRecord(record: ManeuverRecord): ManeuverResponseDto {
    return Object.assign(new ManeuverResponseDto(), record);
  }
}

export class ManeuverErrorResponseDto {
  static fromRecord(record: ManeuverErrorRecord): ManeuverErrorResponseDto {
    return Object.assign(new ManeuverErrorResponseDto(), record);
  }
}

export class SimulationSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty({ enum: LicenseCategory }) licenseCategory!: LicenseCategory;
  @ApiProperty({ enum: SimulationSessionStatus })
  status!: SimulationSessionStatus;
  @ApiProperty() totalScenarios!: number;
  @ApiProperty() correctCount!: number;
  @ApiProperty({ nullable: true }) score!: number | null;
  @ApiProperty({ nullable: true }) isPassed!: boolean | null;
  @ApiProperty() startedAt!: Date;
  @ApiProperty({ nullable: true }) completedAt!: Date | null;

  static fromRecord(
    record: SimulationSessionRecord,
  ): SimulationSessionResponseDto {
    return Object.assign(new SimulationSessionResponseDto(), record);
  }
}
