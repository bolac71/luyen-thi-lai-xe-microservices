import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/notification-client';
import { AuthenticatedUser, Roles } from 'nest-keycloak-connect';
import { NotificationEventPublisher } from '../../application/ports/event-publisher.port';
import {
  ListNotificationsUseCase,
  MarkNotificationReadUseCase,
} from '../../application/use-cases/notification.use-cases';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import {
  AcademicWarningAcceptedResponseDto,
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  NotificationResponseDto,
  SendAcademicWarningRequestDto,
} from '../dtos/notification.dtos';

interface JwtPayload {
  sub?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly eventPublisher: NotificationEventPublisher,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  @Post('admin/academic-warnings')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles({ roles: ['realm:ADMIN', 'realm:CENTER_MANAGER', 'realm:INSTRUCTOR'] })
  @ApiOperation({
    summary: 'Queue academic warnings for asynchronous notification delivery.',
  })
  async sendAcademicWarning(
    @AuthenticatedUser() user: JwtPayload,
    @Body() dto: SendAcademicWarningRequestDto,
  ): Promise<AcademicWarningAcceptedResponseDto> {
    const studentIds = [
      ...(dto.studentId ? [dto.studentId] : []),
      ...(dto.studentIds ?? []),
    ].filter((value, index, items) => items.indexOf(value) === index);

    if (studentIds.length === 0) {
      throw new BadRequestException(
        'At least one student recipient is required',
      );
    }

    const unsupportedChannels = (
      dto.deliveryChannels ?? [NotificationType.IN_APP]
    ).filter((channel) => channel !== NotificationType.IN_APP);
    if (unsupportedChannels.length > 0) {
      throw new BadRequestException(
        'Only IN_APP delivery can be requested from this endpoint; EMAIL/PUSH are resolved by notification-service config and event payload.',
      );
    }

    const warnings = await Promise.all(
      studentIds.map((studentId) =>
        this.notificationRepository.createAcademicWarning({
          studentId,
          reason: dto.reason,
          severity: dto.severity,
          message: dto.message,
          createdById: user.sub ?? '',
        }),
      ),
    );

    await Promise.all(
      warnings.map((warning) =>
        this.eventPublisher.publish('notification.academic-warning.queued', {
          warningId: warning.id,
          studentId: warning.studentId,
          reason: dto.reason,
          severity: dto.severity,
          message: dto.message,
          createdById: user.sub ?? '',
        }),
      ),
    );

    return {
      status: 'ACCEPTED',
      accepted: studentIds.length,
      studentIds,
      message:
        'Academic warning notifications were queued for asynchronous delivery.',
    };
  }

  @Get('notifications/me')
  @Roles({
    roles: [
      'realm:ADMIN',
      'realm:CENTER_MANAGER',
      'realm:INSTRUCTOR',
      'realm:STUDENT',
    ],
  })
  @ApiOperation({ summary: 'List current user notifications' })
  async listMine(
    @AuthenticatedUser() user: JwtPayload,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    const result = await this.listNotificationsUseCase.execute(
      user.sub ?? '',
      query.page ?? 1,
      query.size ?? 20,
    );
    return ListNotificationsResponseDto.fromResult(result);
  }

  @Patch('notifications/:id/read')
  @Roles({
    roles: [
      'realm:ADMIN',
      'realm:CENTER_MANAGER',
      'realm:INSTRUCTOR',
      'realm:STUDENT',
    ],
  })
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    const result = await this.markNotificationReadUseCase.execute(
      id,
      user.sub ?? '',
    );
    return NotificationResponseDto.fromRecord(result);
  }
}
