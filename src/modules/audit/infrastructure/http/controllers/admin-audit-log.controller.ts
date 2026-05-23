import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  Inject,
  HttpCode,
  HttpStatus,
  Header,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../iam/infrastructure/guards/roles.guard';
import { PermissionsGuard } from '../../../../iam/infrastructure/guards/permissions.guard';
import { Roles } from '../../../../iam/infrastructure/decorators/roles.decorator';
import { Permissions } from '../../../../iam/infrastructure/decorators/permissions.decorator';
import type { AuditLogServicePort } from '../../../application/ports/audit-log-service.port';
import { AUDIT_LOG_SERVICE } from '../../../application/ports/audit-log-service.port';
import { AuditLogResponseDto } from '../dtos/audit-log-response.dto';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminAuditLogController {
  constructor(
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService: AuditLogServicePort,
  ) {}

  @Get()
  @Roles('admin', 'manager')
  @Permissions('audit:read')
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let result;

    if (userId) {
      result = await this.auditLogService.findByUserId(userId, { page, limit });
    } else if (module) {
      result = await this.auditLogService.findByModule(module, { page, limit });
    } else if (action) {
      result = await this.auditLogService.findByAction(action, { page, limit });
    } else if (startDate && endDate) {
      result = await this.auditLogService.findByDateRange(
        new Date(startDate),
        new Date(endDate),
        { page, limit },
      );
    } else {
      result = await this.auditLogService.findAll({ page, limit });
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      data: result.data.map(AuditLogResponseDto.fromDomain),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      meta: result.meta,
    };
  }

  @Get('export/excel')
  @Roles('admin', 'manager')
  @Permissions('audit:export')
  @HttpCode(HttpStatus.OK)
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename=audit-logs.xlsx')
  async exportToExcel(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = { userId, module, action, startDate, endDate };

    const buffer = await this.auditLogService.exportToExcel(filters);
    return buffer;
  }

  @Get('export/pdf')
  @Roles('admin', 'manager')
  @Permissions('audit:export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename=audit-logs.pdf')
  async exportToPdf(
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = { userId, module, action, startDate, endDate };

    const buffer = await this.auditLogService.exportToPdf(filters);
    return buffer;
  }
}
