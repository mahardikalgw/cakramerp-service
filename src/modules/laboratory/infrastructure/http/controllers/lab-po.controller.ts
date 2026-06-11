import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { LabPOService } from '../../../application/services/lab-po.service';
import {
  CreateLabPOHttpDto,
  UpdateLabPOHttpDto,
} from '../../http/dtos/lab-po.dto';

@Controller('laboratory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabPOController {
  constructor(private readonly labPOService: LabPOService) {}

  @Get('purchase-orders')
  @RequirePermissions('purchase-orders:read')
  async listPurchaseOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.labPOService.findAll({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('purchase-orders:read')
  async getPurchaseOrder(@Param('id') id: string) {
    return this.labPOService.findById(id);
  }

  @Post('purchase-orders')
  @RequirePermissions('purchase-orders:create')
  async createPurchaseOrder(@Body() dto: CreateLabPOHttpDto) {
    return this.labPOService.create({
      customerId: dto.customerId,
      customerName: dto.customerName ?? '',
      totalAmount: dto.totalAmount,
      purchaseOrderId: dto.purchaseOrderId,
      sampleQuantity: dto.sampleQuantity,
      lines: dto.lines,
    });
  }

  @Put('purchase-orders/:id')
  @RequirePermissions('purchase-orders:update')
  async updatePurchaseOrder(
    @Param('id') id: string,
    @Body() dto: UpdateLabPOHttpDto,
  ) {
    return this.labPOService.update(id, dto);
  }

  @Patch('purchase-orders/:id/sign')
  @RequirePermissions('purchase-orders:approve')
  async signPurchaseOrder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.labPOService.sign(id, userId);
  }

  @Patch('purchase-orders/:id/record-payment')
  @RequirePermissions('purchase-orders:approve')
  async recordPayment(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.labPOService.recordPayment(id, userId);
  }

  @Patch('purchase-orders/:id/activate')
  @RequirePermissions('purchase-orders:approve')
  async activatePurchaseOrder(@Param('id') id: string) {
    return this.labPOService.activate(id);
  }

  @Patch('purchase-orders/:id/close')
  @RequirePermissions('purchase-orders:approve')
  async closePurchaseOrder(@Param('id') id: string) {
    return this.labPOService.close(id);
  }

  @Delete('purchase-orders/:id')
  @RequirePermissions('purchase-orders:delete')
  async deletePurchaseOrder(@Param('id') id: string) {
    await this.labPOService.delete(id);
    return { success: true };
  }
}
