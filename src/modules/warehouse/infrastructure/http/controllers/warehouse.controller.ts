import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Query,
  Body,
  Param,
  UseGuards,
  Inject,
  Req,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../../auth/infrastructure/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../../../auth/infrastructure/guards/permissions.guard'
import { RequirePermissions } from '../../../../auth/infrastructure/decorators/permissions.decorator'
import { STOCK_MOVEMENT_SERVICE } from '../../../application/ports/stock-movement-service.port'
import type { StockMovementServicePort } from '../../../application/ports/stock-movement-service.port'
import { GOODS_RECEIPT_SERVICE } from '../../../application/ports/goods-receipt-service.port'
import type { GoodsReceiptServicePort } from '../../../application/ports/goods-receipt-service.port'
import { STOCK_ISSUANCE_SERVICE } from '../../../application/ports/stock-issuance-service.port'
import type { StockIssuanceServicePort } from '../../../application/ports/stock-issuance-service.port'
import { STOCK_OPNAME_SERVICE } from '../../../application/ports/stock-opname-service.port'
import type { StockOpnameServicePort } from '../../../application/ports/stock-opname-service.port'
import { EQUIPMENT_SERVICE } from '../../../application/ports/equipment-service.port'
import type { EquipmentServicePort } from '../../../application/ports/equipment-service.port'

@Controller('warehouse')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WarehouseController {
  constructor(
    @Inject(STOCK_MOVEMENT_SERVICE)
    private readonly stockService: StockMovementServicePort,
    @Inject(GOODS_RECEIPT_SERVICE)
    private readonly goodsReceiptService: GoodsReceiptServicePort,
    @Inject(STOCK_ISSUANCE_SERVICE)
    private readonly issuanceService: StockIssuanceServicePort,
    @Inject(STOCK_OPNAME_SERVICE)
    private readonly opnameService: StockOpnameServicePort,
    @Inject(EQUIPMENT_SERVICE)
    private readonly equipmentService: EquipmentServicePort,
  ) {}

  // ==================== Stock Dashboard ====================

  @Get('stock')
  @RequirePermissions('inventory:read')
  async getStock(
    @Query('warehouse_id') warehouseId?: string,
    @Query('category') category?: string,
    @Query('below_minimum') belowMinimum?: string,
  ) {
    return this.stockService.getStockBalances({
      warehouseId,
      category,
      belowMinimum: belowMinimum === 'true',
    })
  }

  @Get('stock/:itemId/card')
  @RequirePermissions('inventory:read')
  async getStockCard(@Param('itemId') itemId: string) {
    return this.stockService.getStockCard(itemId)
  }

  // ==================== Goods Receipts ====================

  @Get('goods-receipts')
  @RequirePermissions('warehouse:read')
  async getGoodsReceipts(
    @Query('warehouse_id') warehouseId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.goodsReceiptService.findAll({
      warehouseId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('goods-receipts/:id')
  @RequirePermissions('warehouse:read')
  async getGoodsReceipt(@Param('id') id: string) {
    return this.goodsReceiptService.findById(id)
  }

  @Post('goods-receipts')
  @RequirePermissions('inventory:create', 'inventory:write')
  async createGoodsReceipt(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.goodsReceiptService.create(body, userId)
  }

  // ==================== Stock Issuances ====================

  @Get('issuances')
  @RequirePermissions('warehouse:read')
  async getIssuances(
    @Query('warehouse_id') warehouseId?: string,
    @Query('destination_type') destinationType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.issuanceService.findAll({
      warehouseId,
      destinationType,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('issuances/:id')
  @RequirePermissions('warehouse:read')
  async getIssuance(@Param('id') id: string) {
    return this.issuanceService.findById(id)
  }

  @Post('issuances')
  @RequirePermissions('inventory:create', 'inventory:write')
  async createIssuance(@Body() body: any, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.issuanceService.create(body, userId)
  }

  @Post('issuances/:id/reverse')
  @RequirePermissions('inventory:update', 'inventory:write')
  async reverseIssuance(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    return this.issuanceService.reverse(id, body.reason, userId)
  }

  // ==================== Stock Opname ====================

  @Get('stock-opname')
  @RequirePermissions('warehouse:read')
  async getOpnameSessions(
    @Query('warehouse_id') warehouseId?: string,
    @Query('status') status?: string,
  ) {
    return this.opnameService.findAll({ warehouseId, status })
  }

  @Get('stock-opname/:id')
  @RequirePermissions('warehouse:read')
  async getOpnameSession(@Param('id') id: string) {
    return this.opnameService.findById(id)
  }

  @Post('stock-opname')
  @RequirePermissions('inventory:create', 'inventory:write')
  async createOpname(@Body() body: { warehouseId: string }, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.opnameService.create(body.warehouseId, userId)
  }

  @Patch('stock-opname/:id/counts')
  @RequirePermissions('inventory:update', 'inventory:write')
  async updateOpnameCounts(
    @Param('id') id: string,
    @Body() body: { lines: { itemId: string; actualQty: number }[] },
  ) {
    return this.opnameService.updateCounts(id, body.lines)
  }

  @Patch('stock-opname/:id/submit')
  @RequirePermissions('inventory:update', 'inventory:write')
  async submitOpname(@Param('id') id: string) {
    return this.opnameService.submit(id)
  }

  @Patch('stock-opname/:id/approve')
  @RequirePermissions('warehouse:update', 'warehouse:write')
  async approveOpname(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    return this.opnameService.approve(id, userId)
  }

  // ==================== Equipment ====================

  @Get('equipment')
  @RequirePermissions('equipment:read')
  async getEquipment(
    @Query('type') type?: string,
    @Query('site_id') siteId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.equipmentService.findAll({
      type,
      siteId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('equipment/:id')
  @RequirePermissions('equipment:read')
  async getEquipmentDetail(@Param('id') id: string) {
    return this.equipmentService.findById(id)
  }

  @Post('equipment')
  @RequirePermissions('equipment:create', 'equipment:write')
  async createEquipment(@Body() body: any) {
    return this.equipmentService.create(body)
  }

  @Put('equipment/:id')
  @RequirePermissions('equipment:update', 'equipment:write')
  async updateEquipment(@Param('id') id: string, @Body() body: any) {
    return this.equipmentService.update(id, body)
  }

  @Post('equipment/:id/log-maintenance')
  @RequirePermissions('equipment:update', 'equipment:write')
  async logMaintenance(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    return this.equipmentService.logMaintenance(id, body, userId)
  }

  @Get('equipment/:id/schedules')
  @RequirePermissions('equipment:read')
  async getMaintenanceSchedules(@Param('id') id: string) {
    return this.equipmentService.getMaintenanceSchedules(id)
  }

  @Get('equipment/:id/logs')
  @RequirePermissions('equipment:read')
  async getMaintenanceLogs(@Param('id') id: string) {
    return this.equipmentService.getMaintenanceLogs(id)
  }
}
