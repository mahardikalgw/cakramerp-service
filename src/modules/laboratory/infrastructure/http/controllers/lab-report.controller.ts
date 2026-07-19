import {
  Controller,
  Get,
  Param,
  UseGuards,
  Logger,
  StreamableFile,
  InternalServerErrorException,
  BadGatewayException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabReportController {
  private readonly logger = new Logger(LabReportController.name);
  private readonly excelReportUrl =
    process.env.EXCEL_REPORT_SERVICE_URL || 'http://localhost:8081';
  private readonly documentServiceUrl =
    process.env.DOCUMENT_SERVICE_URL || 'http://localhost:8080';

  private async proxyReport(path: string, baseUrl?: string): Promise<StreamableFile> {
    const url = `${baseUrl || this.excelReportUrl}${path}`;
    this.logger.log(`Proxying report request to ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Report service error: ${response.status} ${text}`);
        throw new InternalServerErrorException(text);
      }
      const disposition =
        response.headers.get('content-disposition') ||
        'attachment; filename="report.xlsx"';
      const buffer = Buffer.from(await response.arrayBuffer());
      return new StreamableFile(buffer, {
        disposition,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (err: any) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`Failed to reach report service: ${err?.message}`);
      throw new BadGatewayException('Report service unavailable');
    }
  }

  @Get('reports/total/:contractId')
  @RequirePermissions('test-results:read')
  async totalReport(@Param('contractId') contractId: string) {
    return this.proxyReport(`/reports/total/${contractId}`);
  }

  @Get('reports/schedule/:scheduleId')
  @RequirePermissions('test-results:read')
  async scheduleReport(@Param('scheduleId') scheduleId: string) {
    // Route to Java/Apache POI service for exact sheet cloning
    return this.proxyReport(`/reports/schedule/${scheduleId}`, this.documentServiceUrl);
  }

  @Get('reports/sample/:resultId')
  @RequirePermissions('test-results:read')
  async sampleReport(@Param('resultId') resultId: string) {
    return this.proxyReport(`/reports/sample/${resultId}`);
  }
}
