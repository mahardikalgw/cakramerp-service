import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { ReportDistributionService } from '../../../application/services/report-distribution.service';
import {
  DistributeReportHttpDto,
  ArchiveDocumentHttpDto,
} from '../../http/dtos/report-distribution.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportDistributionController {
  constructor(
    private readonly distributionService: ReportDistributionService,
  ) {}

  @Get('distributions')
  @RequirePermissions('daily-reports:read')
  async listDistributions(
    @Query('documentType') documentType?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.distributionService.findAll({
      documentType,
      channel,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('distributions/:id')
  @RequirePermissions('daily-reports:read')
  async getDistribution(@Param('id') id: string) {
    return this.distributionService.findById(id);
  }

  @Post('distributions')
  @RequirePermissions('daily-reports:create')
  async distributeReport(@Body() dto: DistributeReportHttpDto) {
    return this.distributionService.distribute(
      dto.documentType,
      dto.documentId,
      dto.documentNumber,
      dto.customerId,
      dto.customerName ?? '',
      dto.channel as any,
      dto.recipientEmail,
      dto.recipientName,
    );
  }

  @Patch('distributions/:id/retry')
  @RequirePermissions('daily-reports:create')
  async retryDistribution(@Param('id') id: string) {
    return this.distributionService.retryDistribution(id);
  }

  @Post('archives')
  @RequirePermissions('daily-reports:create')
  async archiveDocument(@Body() dto: ArchiveDocumentHttpDto, @Req() req: any) {
    return this.distributionService.archiveDocument(
      dto.documentType,
      dto.entityId,
      dto.documentNumber,
      dto.customerId,
      dto.customerName ?? '',
      req.user?.id ?? 'unknown',
    );
  }

  @Get('archives')
  @RequirePermissions('daily-reports:read')
  async listArchives(
    @Query('customerId') customerId?: string,
    @Query('documentType') documentType?: string,
  ) {
    return this.distributionService.getArchivedDocuments(
      customerId,
      documentType,
    );
  }

  @Get('archives/:id')
  @RequirePermissions('daily-reports:read')
  async getArchive(@Param('id') id: string) {
    return this.distributionService.getArchivedDocument(id);
  }

  @Delete('report-distributions/:id')
  @RequirePermissions('daily-reports:delete')
  async deleteDistribution(@Param('id') id: string) {
    return this.distributionService.deleteDistribution(id);
  }

  @Delete('archives/:id')
  @RequirePermissions('daily-reports:delete')
  async deleteArchive(@Param('id') id: string) {
    return this.distributionService.deleteArchivedDocument(id);
  }
}
