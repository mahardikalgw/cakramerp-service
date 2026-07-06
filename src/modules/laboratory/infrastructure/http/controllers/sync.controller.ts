import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import {
  SyncService,
  SyncOperation,
} from '../../../application/services/sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('changes')
  @RequirePermissions('sync:read')
  async getChanges(@Query('since') since?: string) {
    const data = await this.syncService.getChangesSince(since);
    return { data, message: 'ok' };
  }

  @Post('bulk')
  @RequirePermissions('sync:write')
  async bulkSync(@Body() body: { operations: SyncOperation[] }) {
    const data = await this.syncService.processBulkOperations(body.operations);
    return { data, message: 'ok' };
  }
}
