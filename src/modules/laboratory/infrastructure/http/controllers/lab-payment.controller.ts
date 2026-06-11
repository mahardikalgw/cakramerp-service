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
import { LabPaymentService } from '../../../application/services/lab-payment.service';
import {
  CreatePaymentMethodHttpDto,
  UploadPaymentEvidenceHttpDto,
  RejectPaymentEvidenceHttpDto,
} from '../../http/dtos/lab-payment.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabPaymentController {
  constructor(private readonly labPaymentService: LabPaymentService) {}

  @Get('payment-methods')
  @RequirePermissions('purchase-orders:read')
  async getPaymentMethods() {
    return this.labPaymentService.getPaymentMethods();
  }

  @Post('payment-methods')
  @RequirePermissions('purchase-orders:create')
  async createPaymentMethod(@Body() dto: CreatePaymentMethodHttpDto) {
    return this.labPaymentService.createPaymentMethod(dto);
  }

  @Post('payment-evidences')
  @RequirePermissions('purchase-orders:create')
  async uploadPaymentEvidence(
    @Body() dto: UploadPaymentEvidenceHttpDto,
    @Req() req: any,
  ) {
    return this.labPaymentService.uploadPaymentEvidence({
      ...dto,
      submittedBy: req.user?.id ?? 'unknown',
    });
  }

  @Patch('payment-evidences/:id/verify')
  @RequirePermissions('purchase-orders:approve')
  async verifyPaymentEvidence(@Param('id') id: string, @Req() req: any) {
    return this.labPaymentService.verifyPaymentEvidence(
      id,
      req.user?.id ?? 'unknown',
    );
  }

  @Patch('payment-evidences/:id/reject')
  @RequirePermissions('purchase-orders:approve')
  async rejectPaymentEvidence(
    @Param('id') id: string,
    @Body() dto: RejectPaymentEvidenceHttpDto,
    @Req() req: any,
  ) {
    return this.labPaymentService.rejectPaymentEvidence(
      id,
      req.user?.id ?? 'unknown',
      dto.reason,
    );
  }

  @Get('payment-evidences')
  @RequirePermissions('purchase-orders:read')
  async getPaymentEvidences(
    @Query('poId') poId?: string,
    @Query('contractId') contractId?: string,
  ) {
    return this.labPaymentService.getPaymentEvidences(poId, contractId);
  }
}
