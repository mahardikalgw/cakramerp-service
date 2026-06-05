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
import { SALES_SERVICE } from '../../../application/ports/sales-service.port';
import type { SalesServicePort } from '../../../application/ports/sales-service.port';
import { CreateSalesOrderHttpDto } from '../dtos/sales-order.dto';
import { CreateSalesOrderCommand } from '../../../application/commands/create-sales-order.command';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesPortController {
  constructor(
    @Inject(SALES_SERVICE)
    private readonly salesService: SalesServicePort,
  ) {}

  @Get('sales-orders')
  @RequirePermissions('sales-orders:read')
  async listSalesOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesService.findSalesOrders({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('sales-orders/:id')
  @RequirePermissions('sales-orders:read')
  async getSalesOrder(@Param('id') id: string) {
    return this.salesService.findSalesOrderById(id);
  }

  @Post('sales-orders')
  @RequirePermissions('sales-orders:create')
  async createSalesOrder(@Body() dto: CreateSalesOrderHttpDto) {
    const command = new CreateSalesOrderCommand(
      dto.customerId,
      dto.customerName ?? '',
      dto.orderDate,
      dto.expectedDeliveryDate ?? null,
      dto.notes ?? null,
      dto.lines.map((line) => ({
        itemId: line.itemId ?? '',
        itemName: line.itemName,
        quantity: line.quantity,
        uom: line.uom ?? '',
        unitPrice: line.unitPrice,
      })),
    );
    return this.salesService.createSalesOrder(command);
  }
}
