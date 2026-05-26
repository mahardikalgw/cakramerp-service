import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../iam/infrastructure/guards/roles.guard';
import { PermissionsGuard } from '../../../../iam/infrastructure/guards/permissions.guard';
import { Roles } from '../../../../iam/infrastructure/decorators/roles.decorator';
import { Permissions } from '../../../../iam/infrastructure/decorators/permissions.decorator';
import type { BackupServicePort } from '../../../application/ports/backup-service.port';
import { BACKUP_SERVICE } from '../../../application/ports/backup-service.port';
import { CreateBackupHttpDto } from '../dtos/create-backup.dto';
import { UpdateBackupHttpDto } from '../dtos/update-backup.dto';
import { BackupJobResponseDto } from '../dtos/backup-job-response.dto';

@Controller('admin/backups')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AdminBackupController {
  constructor(
    @Inject(BACKUP_SERVICE)
    private readonly backupService: BackupServicePort,
  ) {}

  @Get()
  // eslint-disable-next-line @typescript-eslint/unbound-method
  @Roles('admin')
  @Permissions('backups:read')
  async getAllBackupJobs() {
    const backupJobs = await this.backupService.getAllBackupJobs();
    return {
      data: backupJobs.map(BackupJobResponseDto.fromDomain),
    };
  }

  @Get(':id')
  @Roles('admin')
  @Permissions('backups:read')
  async getBackupJobById(@Param('id') id: string) {
    const backupJob = await this.backupService.getBackupJobById(id);
    return BackupJobResponseDto.fromDomain(backupJob);
  }

  @Post()
  @Roles('admin')
  @Permissions('backups:create')
  async createBackupJob(@Body() dto: CreateBackupHttpDto) {
    const command = {
      name: dto.name,
      schedule: dto.schedule,
      retentionDays: dto.retentionDays,
    };
    const backupJob = await this.backupService.createBackupJob(command);
    return BackupJobResponseDto.fromDomain(backupJob);
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('backups:create')
  async updateBackupJob(
    @Param('id') id: string,
    @Body() dto: UpdateBackupHttpDto,
  ) {
    const command = {
      id,
      name: dto.name,
      schedule: dto.schedule,
      status: dto.status,
      retentionDays: dto.retentionDays,
    };
    const backupJob = await this.backupService.updateBackupJob(command);
    return BackupJobResponseDto.fromDomain(backupJob);
  }

  @Post(':id/trigger')
  @Roles('admin')
  @Permissions('backups:create')
  async triggerBackup(@Param('id') id: string) {
    const backupHistory = await this.backupService.triggerBackup(id);
    return { message: 'Backup triggered', backupId: backupHistory.id };
  }

  @Get(':id/history')
  @Roles('admin')
  @Permissions('backups:read')
  async getBackupHistory(@Param('id') id: string) {
    const history = await this.backupService.getBackupHistory(id);
    return { data: history };
  }

  @Post('history/:id/restore')
  @Roles('admin')
  @Permissions('backups:create')
  async restoreBackup(@Param('id') id: string) {
    await this.backupService.restoreBackup(id);
    return { message: 'Backup restored successfully' };
  }
}
