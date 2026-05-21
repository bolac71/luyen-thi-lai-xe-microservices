import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';
import {
  GetManeuverUseCase,
  ListManeuverErrorsUseCase,
  ListManeuversUseCase,
  SaveSimulationAnswerUseCase,
  StartSimulationSessionUseCase,
  SubmitSimulationSessionUseCase,
} from '../../application/use-cases/simulation.use-cases';
import {
  LicenseCategoryQueryDto,
  ManeuverErrorResponseDto,
  ManeuverResponseDto,
  SaveSimulationAnswerRequestDto,
  SimulationSessionResponseDto,
  StartSimulationSessionRequestDto,
} from '../dtos/simulation.dtos';

interface JwtPayload {
  sub?: string;
}

@ApiTags('Simulation')
@ApiBearerAuth()
@Controller('simulation')
export class SimulationController {
  constructor(
    private readonly listManeuversUseCase: ListManeuversUseCase,
    private readonly getManeuverUseCase: GetManeuverUseCase,
    private readonly listManeuverErrorsUseCase: ListManeuverErrorsUseCase,
    private readonly startSimulationSessionUseCase: StartSimulationSessionUseCase,
    private readonly saveSimulationAnswerUseCase: SaveSimulationAnswerUseCase,
    private readonly submitSimulationSessionUseCase: SubmitSimulationSessionUseCase,
  ) {}

  @Get('maneuvers')
  @Roles({
    roles: [
      'realm:STUDENT',
      'realm:INSTRUCTOR',
      'realm:ADMIN',
      'realm:CENTER_MANAGER',
    ],
  })
  @ApiOperation({ summary: 'List maneuver checkpoints by license category' })
  async listManeuvers(
    @Query() query: LicenseCategoryQueryDto,
  ): Promise<ManeuverResponseDto[]> {
    const result = await this.listManeuversUseCase.execute(
      query.licenseCategory,
    );
    return result.map(ManeuverResponseDto.fromRecord);
  }

  @Get('maneuvers/:id')
  @Roles({
    roles: [
      'realm:STUDENT',
      'realm:INSTRUCTOR',
      'realm:ADMIN',
      'realm:CENTER_MANAGER',
    ],
  })
  @ApiOperation({ summary: 'Get maneuver checkpoint details' })
  async getManeuver(@Param('id') id: string): Promise<ManeuverResponseDto> {
    const result = await this.getManeuverUseCase.execute(id);
    if (!result) throw new NotFoundException('Maneuver not found');
    return ManeuverResponseDto.fromRecord(result);
  }

  @Get('maneuver-errors')
  @Roles({
    roles: [
      'realm:STUDENT',
      'realm:INSTRUCTOR',
      'realm:ADMIN',
      'realm:CENTER_MANAGER',
    ],
  })
  @ApiOperation({ summary: 'List general maneuver errors by license category' })
  async listErrors(
    @Query() query: LicenseCategoryQueryDto,
  ): Promise<ManeuverErrorResponseDto[]> {
    const result = await this.listManeuverErrorsUseCase.execute(
      query.licenseCategory,
    );
    return result.map(ManeuverErrorResponseDto.fromRecord);
  }

  @Post('sessions')
  @Roles({ roles: ['realm:STUDENT'] })
  @ApiOperation({ summary: 'Start a driving practice simulation session' })
  async startSession(
    @AuthenticatedUser() user: JwtPayload,
    @Body() dto: StartSimulationSessionRequestDto,
  ): Promise<SimulationSessionResponseDto> {
    const result = await this.startSimulationSessionUseCase.execute(
      user.sub ?? '',
      dto.licenseCategory,
    );
    return SimulationSessionResponseDto.fromRecord(result);
  }

  @Patch('sessions/:id/answers')
  @Roles({ roles: ['realm:STUDENT'] })
  @ApiOperation({
    summary: 'Save simulation answer while session is in progress',
  })
  async saveAnswer(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') sessionId: string,
    @Body() dto: SaveSimulationAnswerRequestDto,
  ): Promise<SimulationSessionResponseDto> {
    const result = await this.saveSimulationAnswerUseCase.execute({
      sessionId,
      studentId: user.sub ?? '',
      scenarioId: dto.scenarioId,
      selectedOptionId: dto.selectedOptionId,
      isCorrect: dto.isCorrect,
    });
    return SimulationSessionResponseDto.fromRecord(result);
  }

  @Post('sessions/:id/submit')
  @Roles({ roles: ['realm:STUDENT'] })
  @ApiOperation({ summary: 'Submit simulation session' })
  async submit(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') sessionId: string,
  ): Promise<SimulationSessionResponseDto> {
    const result = await this.submitSimulationSessionUseCase.execute(
      sessionId,
      user.sub ?? '',
    );
    return SimulationSessionResponseDto.fromRecord(result);
  }
}
