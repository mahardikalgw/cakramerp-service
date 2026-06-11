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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { VerificationService } from '../../../application/services/verification.service';
import {
  CreateVerificationHttpDto,
  VerifyChecklistItemHttpDto,
  RejectVerificationHttpDto,
} from '../../http/dtos/verification.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('verifications')
  @RequirePermissions('testing-requests:read')
  async listVerifications(
    @Query('entityType') entityType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.verificationService.findAll({
      entityType,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('verifications/:id')
  @RequirePermissions('testing-requests:read')
  async getVerification(@Param('id') id: string) {
    return this.verificationService.findById(id);
  }

  @Post('verifications')
  @RequirePermissions('testing-requests:approve')
  async createVerification(
    @Body() dto: CreateVerificationHttpDto,
    @Req() req: any,
  ) {
    return this.verificationService.createVerification(
      dto.entityType,
      dto.entityId,
      req.user?.id ?? 'unknown',
      req.user?.name,
    );
  }

  @Patch('verifications/:id/verify-item')
  @RequirePermissions('testing-requests:approve')
  async verifyItem(
    @Param('id') id: string,
    @Body() dto: VerifyChecklistItemHttpDto,
    @Req() req: any,
  ) {
    return this.verificationService.verifyItem(
      id,
      dto.itemIndex,
      req.user?.id ?? 'unknown',
      dto.documentUrl,
      dto.notes,
    );
  }

  @Patch('verifications/:id/verify-and-activate')
  @RequirePermissions('testing-requests:approve')
  async verifyAndActivate(@Param('id') id: string, @Req() req: any) {
    return this.verificationService.verifyAndActivate(
      id,
      req.user?.id ?? 'unknown',
      req.user?.name,
    );
  }

  @Patch('verifications/:id/reject')
  @RequirePermissions('testing-requests:approve')
  async rejectVerification(
    @Param('id') id: string,
    @Body() dto: RejectVerificationHttpDto,
    @Req() req: any,
  ) {
    return this.verificationService.rejectVerification(
      id,
      req.user?.id ?? 'unknown',
      dto.rejectionReason,
    );
  }
}
