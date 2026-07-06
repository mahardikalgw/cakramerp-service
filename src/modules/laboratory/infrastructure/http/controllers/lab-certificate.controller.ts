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
import { LabCertificateService } from '../../../application/services/lab-certificate.service';
import {
  GenerateCertificateHttpDto,
  RevokeCertificateHttpDto,
} from '../../http/dtos/lab-certificate.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabCertificateController {
  constructor(private readonly certificateService: LabCertificateService) {}

  @Get('certificates')
  @RequirePermissions('test-results:read')
  async listCertificates(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.certificateService.findAll({
      status,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('certificates/:id')
  @RequirePermissions('test-results:read')
  async getCertificate(@Param('id') id: string) {
    return this.certificateService.findById(id);
  }

  @Post('certificates')
  @RequirePermissions('test-results:create')
  async generateCertificate(
    @Body() dto: GenerateCertificateHttpDto,
    @Req() req: any,
  ) {
    return this.certificateService.generateCertificate(
      dto.testingRequestId,
      req.user?.id ?? 'unknown',
      req.user?.name,
    );
  }

  @Patch('certificates/:id/issue')
  @RequirePermissions('test-results:approve')
  async issueCertificate(@Param('id') id: string, @Req() req: any) {
    return this.certificateService.issueCertificate(
      id,
      req.user?.id ?? 'unknown',
      req.user?.name,
    );
  }

  @Patch('certificates/:id/revoke')
  @RequirePermissions('test-results:approve')
  async revokeCertificate(
    @Param('id') id: string,
    @Body() dto: RevokeCertificateHttpDto,
    @Req() req: any,
  ) {
    return this.certificateService.revokeCertificate(
      id,
      req.user?.id ?? 'unknown',
      dto.reason,
    );
  }

  @Get('certificates/:id/documents')
  @RequirePermissions('test-results:read')
  async getCertificateDocuments(@Param('id') id: string) {
    return this.certificateService.getCertificateDocuments(id);
  }

  @Get('certificates/verify/:qrHash')
  async verifyByQr(@Param('qrHash') qrHash: string) {
    return this.certificateService.verifyByQr(qrHash);
  }

  @Delete('certificates/:id')
  @RequirePermissions('test-results:delete')
  async deleteCertificate(@Param('id') id: string) {
    return this.certificateService.delete(id);
  }
}
