import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'nest-keycloak-connect';
import { ListSessionsQuery } from '../../application/use-cases/list-sessions/list-sessions.query';
import { ListSessionsUseCase } from '../../application/use-cases/list-sessions/list-sessions.use-case';
import { ListExamSessionsResponseDto } from '../dtos/exam-session.response.dto';
import { ListSessionsQueryDto } from '../dtos/list-sessions.query.dto';

class AdminListSessionsQueryDto extends ListSessionsQueryDto {
  studentId?: string;
}

@ApiTags('Admin Exam Sessions')
@ApiBearerAuth()
@Controller('admin/exams/sessions')
export class AdminExamSessionController {
  constructor(private readonly listSessionsUseCase: ListSessionsUseCase) {}

  @Get()
  @Roles({ roles: ['realm:ADMIN', 'realm:CENTER_MANAGER', 'realm:INSTRUCTOR'] })
  @ApiOperation({ summary: 'List exam history for admin/instructor dashboard' })
  async listSessions(
    @Query() query: AdminListSessionsQueryDto,
  ): Promise<ListExamSessionsResponseDto> {
    const result = await this.listSessionsUseCase.execute(
      new ListSessionsQuery(
        query.studentId ?? '',
        query.page ?? 1,
        query.size ?? 20,
        query.status,
        query.isPassed,
        query.from ? new Date(query.from) : undefined,
        query.to ? new Date(query.to) : undefined,
      ),
    );
    return ListExamSessionsResponseDto.fromResult(result);
  }
}
