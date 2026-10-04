import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
  StreamableFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { ScheduleReportBuilder } from '../../../../shared/infrastructure/document-generation/reports/schedule-report.builder';
import { ContractTotalReportBuilder } from '../../../../shared/infrastructure/document-generation/reports/contract-total-report.builder';
import { SampleReportBuilder } from '../../../../shared/infrastructure/document-generation/reports/sample-report.builder';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabReportController {
  private readonly logger = new Logger(LabReportController.name);

  constructor(
    private readonly scheduleReportBuilder: ScheduleReportBuilder,
    private readonly contractTotalReportBuilder: ContractTotalReportBuilder,
    private readonly sampleReportBuilder: SampleReportBuilder,
  ) {}

  private toFile(buffer: Buffer, filename: string): StreamableFile {
    return new StreamableFile(buffer, {
      disposition: `attachment; filename="${filename}"`,
      type: XLSX_MIME,
    });
  }

  private async generate(
    label: string,
    factory: () => Promise<Buffer>,
    filename: string,
  ): Promise<StreamableFile> {
    try {
      return this.toFile(await factory(), filename);
    } catch (err: any) {
      this.logger.error(`Failed to generate ${label}: ${err?.message ?? err}`);
      throw new InternalServerErrorException(err?.message ?? `${label} failed`);
    }
  }

  @Get('reports/total/:contractId')
  @RequirePermissions('test-results:read')
  async totalReport(@Param('contractId') contractId: string) {
    return this.generate(
      'contract total report',
      () => this.contractTotalReportBuilder.build(contractId),
      `report_total_${contractId}.xlsx`,
    );
  }

  @Get('reports/schedule/:scheduleId')
  @RequirePermissions('test-results:read')
  async scheduleReport(@Param('scheduleId') scheduleId: string) {
    return this.generate(
      'schedule report',
      () => this.scheduleReportBuilder.build(scheduleId),
      `report_schedule_${scheduleId}.xlsx`,
    );
  }

  @Get('reports/sample/:resultId')
  @RequirePermissions('test-results:read')
  async sampleReport(@Param('resultId') resultId: string) {
    return this.generate(
      'sample report',
      () => this.sampleReportBuilder.build(resultId),
      `report_sample_${resultId}.xlsx`,
    );
  }
}
