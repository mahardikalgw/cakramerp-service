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
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard';
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator';
import { PurchaseRequestService } from '../../../application/services/purchase-request.service';
import { PurchaseOrderService } from '../../../application/services/purchase-order.service';
import { PurchaseReturnService } from '../../../application/services/purchase-return.service';
import { PurchaseOrchestratorService } from '../../../application/services/purchase-orchestrator.service';
import { TraceabilityService } from '../../../application/services/traceability.service';
import {
  CreatePurchaseRequestHttpDto,
  UpdatePurchaseRequestHttpDto,
  ApproveRejectDto,
} from '../dtos/purchase-request.dto';
import {
  CreatePurchaseOrderHttpDto,
  UpdatePurchaseOrderHttpDto,
  POApproveRejectDto,
} from '../dtos/purchase-order.dto';
import { CreatePurchaseReturnHttpDto } from '../dtos/purchase-return.dto';

/**
 * Throttle preset for state-changing endpoints (approve/reject/deliver/
 * invoice/cancel/convert). Caps at 5 actions per 10 seconds per user so
 * bulk-clicking doesn't accidentally fire dozens of GL entries.
 */
const WRITE_THROTTLE = { 'write': { ttl: 10_000, limit: 5 } } as const;

@Controller('purchasing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseController {
  constructor(
    private readonly purchaseRequestService: PurchaseRequestService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly purchaseReturnService: PurchaseReturnService,
    private readonly orchestrator: PurchaseOrchestratorService,
    private readonly traceability: TraceabilityService,
  ) {}

  // ==================== Purchase Requests ====================

  @Get('purchase-requests')
  @RequirePermissions('purchase-requests:read')
  async listPurchaseRequests(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseRequestService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('purchase-requests/:id')
  @RequirePermissions('purchase-requests:read')
  async getPurchaseRequest(@Param('id') id: string) {
    return this.purchaseRequestService.findById(id);
  }

  @Post('purchase-requests')
  @RequirePermissions('purchase-requests:create')
  async createPurchaseRequest(@Body() dto: CreatePurchaseRequestHttpDto) {
    return this.purchaseRequestService.create(dto);
  }

  @Post('purchase-requests/:id/convert-to-po')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-orders:create')
  async convertPRToPO(@Param('id') id: string, @Req() req: any) {
    const pr = await this.purchaseRequestService.findById(id);
    if (!pr || pr.status !== 'approved') {
      throw new BadRequestException(
        'Only approved purchase requests can be converted to PO',
      );
    }
    return this.purchaseOrderService.create({
      supplierId: '',
      supplierName: '',
      purchaseRequestId: id,
      orderDate: new Date().toISOString().split('T')[0],
      lines: [],
    });
  }

  @Put('purchase-requests/:id')
  @RequirePermissions('purchase-requests:update')
  async updatePurchaseRequest(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseRequestHttpDto,
  ) {
    return this.purchaseRequestService.update(id, dto);
  }

  @Patch('purchase-requests/:id/approve')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-requests:approve')
  async approvePurchaseRequest(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.purchaseRequestService.approve(id, userId);
  }

  @Patch('purchase-requests/:id/reject')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-requests:approve')
  async rejectPurchaseRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown';
    return this.purchaseRequestService.reject(id, userId, dto.rejectionReason);
  }

  @Delete('purchase-requests/:id')
  @RequirePermissions('purchase-requests:delete')
  async deletePurchaseRequest(@Param('id') id: string) {
    await this.purchaseRequestService.delete(id);
    return { success: true };
  }

  // ==================== Purchase Orders ====================

  @Get('purchase-orders')
  @RequirePermissions('purchase-orders:read')
  async listPurchaseOrders(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrderService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('purchase-orders:read')
  async getPurchaseOrder(@Param('id') id: string) {
    return this.purchaseOrderService.findById(id);
  }

  @Post('purchase-orders')
  @RequirePermissions('purchase-orders:create')
  async createPurchaseOrder(@Body() dto: CreatePurchaseOrderHttpDto) {
    return this.purchaseOrderService.create(dto);
  }

  @Put('purchase-orders/:id')
  @RequirePermissions('purchase-orders:update')
  async updatePurchaseOrder(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderHttpDto,
  ) {
    return this.purchaseOrderService.update(id, dto);
  }

  @Patch('purchase-orders/:id/approve')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-orders:approve')
  async approvePurchaseOrder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.orchestrator.approvePO(id, userId);
  }

  @Patch('purchase-orders/:id/reject')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-orders:approve')
  async rejectPurchaseOrder(
    @Param('id') id: string,
    @Body() dto: POApproveRejectDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown';
    return this.orchestrator.rejectPO(id, userId, dto.rejectionReason);
  }

  @Post('purchase-orders/:id/receive')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('goods-receipts:create')
  async receivePurchaseOrder(
    @Param('id') id: string,
    @Body() body: { warehouseId: string },
    @Req() req: any,
  ) {
    if (!body?.warehouseId) {
      throw new BadRequestException('warehouseId is required');
    }
    const userId = req.user?.id ?? 'unknown';
    return this.orchestrator.receivePO(id, userId, body.warehouseId);
  }

  @Post('purchase-orders/:id/invoice')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('supplier-invoices:create')
  async invoicePurchaseOrder(
    @Param('id') id: string,
    @Body()
    body?: {
      supplierInvoiceNumber?: string;
      dueDate?: string;
    },
    @Req() req?: any,
  ) {
    const userId = req?.user?.id ?? 'unknown';
    return this.orchestrator.invoicePO(id, userId, body);
  }

  @Delete('purchase-orders/:id')
  @RequirePermissions('purchase-orders:delete')
  async deletePurchaseOrder(@Param('id') id: string) {
    await this.purchaseOrderService.delete(id);
    return { success: true };
  }

  @Post('purchase-orders/:id/cancel')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-orders:update')
  async cancelPurchaseOrder(
    @Param('id') id: string,
    @Body() body?: { reason?: string },
    @Req() req?: any,
  ) {
    const userId = req?.user?.id ?? 'unknown';
    return this.purchaseOrderService.cancel(id, userId, body?.reason);
  }

  // ==================== Purchase Returns ====================

  @Get('purchase-returns')
  @RequirePermissions('purchase-returns:read')
  async listPurchaseReturns(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseReturnService.findAll({
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('purchase-returns/:id')
  @RequirePermissions('purchase-returns:read')
  async getPurchaseReturn(@Param('id') id: string) {
    return this.purchaseReturnService.findById(id);
  }

  @Post('purchase-returns')
  @RequirePermissions('purchase-returns:create')
  async createPurchaseReturn(@Body() dto: CreatePurchaseReturnHttpDto) {
    return this.purchaseReturnService.create(dto);
  }

  @Put('purchase-returns/:id')
  @RequirePermissions('purchase-returns:update')
  async updatePurchaseReturn(
    @Param('id') id: string,
    @Body() dto: CreatePurchaseReturnHttpDto,
  ) {
    return this.purchaseReturnService.update(id, dto);
  }

  @Patch('purchase-returns/:id/approve')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-returns:create')
  async approvePurchaseReturn(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown';
    return this.orchestrator.approvePurchaseReturn(id, userId);
  }

  @Patch('purchase-returns/:id/reject')
  @Throttle(WRITE_THROTTLE)
  @RequirePermissions('purchase-returns:approve')
  async rejectPurchaseReturn(
    @Param('id') id: string,
    @Body() dto: { rejectionReason?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown';
    return this.purchaseReturnService.reject(id, userId, dto?.rejectionReason);
  }

  @Delete('purchase-returns/:id')
  @RequirePermissions('purchase-returns:delete')
  async deletePurchaseReturn(@Param('id') id: string) {
    await this.purchaseReturnService.delete(id);
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
