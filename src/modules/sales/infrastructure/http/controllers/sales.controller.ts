import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { QuotationService } from '../../../application/services/quotation.service';
import { SalesOrderService } from '../../../application/services/sales-order.service';
import { SalesReturnService } from '../../../application/services/sales-return.service';
import { SalesOrchestratorService } from '../../../application/services/sales-orchestrator.service';
import { SalesTraceabilityService } from '../../../application/services/sales-traceability.service';
import {
  CreateQuotationHttpDto,
  UpdateQuotationHttpDto,
} from '../dtos/quotation.dto';
import {
  CreateSalesOrderHttpDto,
  UpdateSalesOrderHttpDto,
  ApproveRejectDto,
} from '../dtos/sales-order.dto';
import { CreateSalesReturnHttpDto } from '../dtos/sales-return.dto';

/**
 * Throttle preset for state-changing endpoints (send/accept/reject/
 * approve/deliver/invoice/cancel/convert). Caps at 5 actions per
 * 10 seconds per user.
 */
const WRITE_THROTTLE = { 'write': { ttl: 10_000, limit: 5 } } as const;

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly quotationService: QuotationService,
    private readonly salesOrderService: SalesOrderService,
    private readonly salesReturnService: SalesReturnService,
    private readonly orchestrator: SalesOrchestratorService,
    private readonly traceability: SalesTraceabilityService,
  ) {}

  // ==================== Quotations ====================

  @Get('quotations')
  @RequirePermissions('quotations:read')
  async listQuotations(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quotationService.findAll({
      search,
      status,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('quotations/:id')
  @RequirePermissions('quotations:read')
  async getQuotation(@Param('id') id: string) {
    return this.quotationService.findById(id);
  }

  @Post('quotations')
  @RequirePermissions('quotations:create')
  async createQuotation(@Body() dto: CreateQuotationHttpDto) {
    return this.quotationService.create(dto);
  }

  @Put('quotations/:id')
  @RequirePermissions('quotations:update')
  async updateQuotation(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationHttpDto,
  ) {
    return this.quotationService.update(id, dto);
  }

  @Delete('quotations/:id')
  @RequirePermissions('quotations:delete')
  async deleteQuotation(@Param('id') id: string) {
    await this.quotationService.delete(id);
    return { success: true };
  }

  @Patch('quotations/:id/send')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('quotations:update')
  async sendQuotation(@Param('id') id: string) {
    return this.quotationService.send(id);
  }

  @Patch('quotations/:id/accept')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('quotations:update')
  async acceptQuotation(@Param('id') id: string) {
    return this.quotationService.accept(id);
  }

  @Patch('quotations/:id/reject')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('quotations:update')
  async rejectQuotation(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.quotationService.reject(id, body?.reason);
  }

  @Post('quotations/:id/convert-to-so')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-orders:create')
  async convertQuotationToSO(@Param('id') id: string, @Req() req: any) {
    const quotation = await this.quotationService.findById(id);
    if (!quotation || quotation.status !== 'accepted') {
      throw new BadRequestException(
        'Only accepted quotations can be converted to sales orders',
      );
    }
    return this.salesOrderService.create({
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      quotationId: id,
      orderDate: new Date().toISOString().split('T')[0],
      lines: [],
    });
  }

  // ==================== Sales Orders ====================

  @Get('sales-orders')
  @RequirePermissions('sales-orders:read')
  async listSalesOrders(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesOrderService.findAll({
      search,
      status,
      customerId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('sales-orders/:id')
  @RequirePermissions('sales-orders:read')
  async getSalesOrder(@Param('id') id: string) {
    return this.salesOrderService.findById(id);
  }

  @Post('sales-orders')
  @RequirePermissions('sales-orders:create')
  async createSalesOrder(@Body() dto: CreateSalesOrderHttpDto) {
    return this.salesOrderService.create(dto);
  }

  @Put('sales-orders/:id')
  @RequirePermissions('sales-orders:update')
  async updateSalesOrder(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderHttpDto,
  ) {
    return this.salesOrderService.update(id, dto);
  }

  @Patch('sales-orders/:id/approve')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-orders:approve')
  async approveSalesOrder(@Param('id') id: string) {
    return this.orchestrator.approveSO(id);
  }

  @Patch('sales-orders/:id/reject')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-orders:approve')
  async rejectSalesOrder(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.orchestrator.rejectSO(id, dto.rejectionReason);
  }

  @Post('sales-orders/:id/deliver')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('issuances:create')
  async deliverSalesOrder(
    @Param('id') id: string,
    @Body() body: { warehouseId: string },
    @Req() req: any,
  ) {
    if (!body?.warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    const userId = req?.user?.id ?? 'unknown';
    return this.orchestrator.deliverSO(id, userId, body.warehouseId);
  }

  @Post('sales-orders/:id/invoice')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-invoices:create')
  async invoiceSalesOrder(
    @Param('id') id: string,
    @Body() body?: { dueDate?: string },
    @Req() req?: any,
  ) {
    const userId = req?.user?.id ?? 'unknown';
    return this.orchestrator.invoiceSO(id, userId, body);
  }

  @Delete('sales-orders/:id')
  @RequirePermissions('sales-orders:delete')
  async deleteSalesOrder(@Param('id') id: string) {
    await this.salesOrderService.delete(id);
    return { success: true };
  }

  @Post('sales-orders/:id/cancel')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-orders:update')
  async cancelSalesOrder(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.salesOrderService.cancel(id, body?.reason);
  }

  // ==================== Sales Returns ====================

  @Get('sales-returns')
  @RequirePermissions('sales-returns:read')
  async listSalesReturns(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Query('sales_order_id') salesOrderId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.salesReturnService.findAll({
      search,
      status,
      customerId,
      salesOrderId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('sales-returns/:id')
  @RequirePermissions('sales-returns:read')
  async getSalesReturn(@Param('id') id: string) {
    return this.salesReturnService.findById(id);
  }

  @Post('sales-returns')
  @RequirePermissions('sales-returns:create')
  async createSalesReturn(@Body() dto: CreateSalesReturnHttpDto) {
    return this.salesReturnService.create(dto);
  }

  @Put('sales-returns/:id')
  @RequirePermissions('sales-returns:update')
  async updateSalesReturn(
    @Param('id') id: string,
    @Body() dto: CreateSalesReturnHttpDto,
  ) {
    return this.salesReturnService.update(id, dto);
  }

  @Patch('sales-returns/:id/approve')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-returns:create')
  async approveSalesReturn(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const approverId = req?.user?.id ?? 'unknown';
    return this.orchestrator.approveSalesReturn(
      id,
      approverId,
      body?.reason ?? '',
    );
  }

  @Patch('sales-returns/:id/reject')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('sales-returns:approve')
  async rejectSalesReturn(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
    @Req() req?: any,
  ) {
    const approverId = req?.user?.id ?? 'unknown';
    return this.salesReturnService.reject(id, approverId, body?.reason);
  }

  @Delete('sales-returns/:id')
  @RequirePermissions('sales-returns:delete')
  async deleteSalesReturn(@Param('id') id: string) {
    await this.salesReturnService.delete(id);
    return { success: true };
  }

  // ==================== Traceability ====================

  @Get('trace/:sourceType/:sourceId')
  @RequirePermissions('trace:read')
  async getChain(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.traceability.getChain(sourceType, sourceId);
  }
}
