import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { PURCHASING_SERVICE } from '../../../application/ports/purchasing-service.port';
import type { PurchasingServicePort } from '../../../application/ports/purchasing-service.port';
import { CreatePurchaseOrderHttpDto } from '../dtos/purchase-order.dto';
import { CreatePurchaseOrderCommand } from '../../../application/commands/create-purchase-order.command';

@Controller('purchasing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasingController {
  constructor(
    @Inject(PURCHASING_SERVICE)
    private readonly purchasingService: PurchasingServicePort,
  ) {}

  @Get('purchase-orders')
  @RequirePermissions('purchase-orders:read')
  async listPurchaseOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchasingService.findPurchaseOrders({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('purchase-orders:read')
  async getPurchaseOrder(@Param('id') id: string) {
    return this.purchasingService.findPurchaseOrderById(id);
  }

  @Post('purchase-orders')
  @RequirePermissions('purchase-orders:create')
  async createPurchaseOrder(@Body() dto: CreatePurchaseOrderHttpDto) {
    const command = new CreatePurchaseOrderCommand(
      dto.supplierId,
      dto.supplierName ?? '',
      dto.orderDate,
      dto.expectedDeliveryDate ?? null,
      dto.notes ?? null,
      dto.lines.map((line) => ({
        itemId: line.itemId ?? '',
        itemName: line.itemName,
        quantity: line.quantity,
        uom: line.uom ?? '',
        unitCost: line.unitCost,
      })),
    );
    return this.purchasingService.createPurchaseOrder(command);
  }
}
