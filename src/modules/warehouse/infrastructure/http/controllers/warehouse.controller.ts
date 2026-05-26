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
import { ITEM_SERVICE } from '../../../application/ports/item-service.port'
import type { ItemServicePort } from '../../../application/ports/item-service.port'

import { CreateItemCommand } from '../../../application/commands/create-item.command'
import { UpdateItemCommand } from '../../../application/commands/update-item.command'
import { CreateGoodsReceiptCommand } from '../../../application/commands/create-goods-receipt.command'
import { CreateStockIssuanceCommand } from '../../../application/commands/create-stock-issuance.command'
import { CreateStockOpnameSessionCommand } from '../../../application/commands/create-stock-opname-session.command'
import { UpdateOpnameCountsCommand } from '../../../application/commands/update-opname-counts.command'
import { CreateEquipmentCommand } from '../../../application/commands/create-equipment.command'
import { UpdateEquipmentCommand } from '../../../application/commands/update-equipment.command'
import { LogMaintenanceCommand } from '../../../application/commands/log-maintenance.command'

import { CreateItemHttpDto, UpdateItemHttpDto } from '../dtos/item.dto'
import {
  CreateGoodsReceiptHttpDto,
  CreateStockIssuanceHttpDto,
  ReverseIssuanceHttpDto,
  CreateStockOpnameHttpDto,
  UpdateOpnameCountsHttpDto,
} from '../dtos/stock.dto'
import {
  CreateEquipmentHttpDto,
  UpdateEquipmentHttpDto,
  LogMaintenanceHttpDto,
} from '../dtos/equipment.dto'

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
    @Inject(ITEM_SERVICE)
    private readonly itemService: ItemServicePort,
  ) {}

  // ==================== Items (Stock Items) ====================

  @Get('items')
  @RequirePermissions('stock-items:read')
  async getItems(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('is_active') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.itemService.findAll({
      search,
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get('items/:id')
  @RequirePermissions('stock-items:read')
  async getItem(@Param('id') id: string) {
    return this.itemService.findById(id)
  }

  @Post('items')
  @RequirePermissions('stock-items:create')
  async createItem(@Body() dto: CreateItemHttpDto) {
    const command = new CreateItemCommand(
      dto.code,
      dto.name,
      dto.category,
      dto.uom,
      dto.minStockLevel,
    )
    return this.itemService.create(command)
  }

  @Put('items/:id')
  @RequirePermissions('stock-items:update')
  async updateItem(@Param('id') id: string, @Body() dto: UpdateItemHttpDto) {
    const command = new UpdateItemCommand(
      dto.code,
      dto.name,
      dto.category,
      dto.uom,
      dto.minStockLevel,
      dto.isActive,
    )
    return this.itemService.update(id, command)
  }

  @Delete('items/:id')
  @RequirePermissions('stock-items:delete')
  async deleteItem(@Param('id') id: string) {
    return this.itemService.delete(id)
  }

  // ==================== Stock Dashboard ====================

  @Get('stock')
  @RequirePermissions('stock:read')
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
  @RequirePermissions('stock:read')
  async getStockCard(@Param('itemId') itemId: string) {
    return this.stockService.getStockCard(itemId)
  }

  // ==================== Goods Receipts ====================

  @Get('goods-receipts')
  @RequirePermissions('goods-receipts:read')
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
  @RequirePermissions('goods-receipts:read')
  async getGoodsReceipt(@Param('id') id: string) {
    return this.goodsReceiptService.findById(id)
  }

  @Post('goods-receipts')
  @RequirePermissions('goods-receipts:create')
  async createGoodsReceipt(@Body() dto: CreateGoodsReceiptHttpDto, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    const command = new CreateGoodsReceiptCommand(
      dto.warehouseId,
      dto.reference,
      dto.lines,
    )
    return this.goodsReceiptService.create(command, userId)
  }

  // ==================== Stock Issuances ====================

  @Get('issuances')
  @RequirePermissions('issuances:read')
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
  @RequirePermissions('issuances:read')
  async getIssuance(@Param('id') id: string) {
    return this.issuanceService.findById(id)
  }

  @Post('issuances')
  @RequirePermissions('issuances:create')
  async createIssuance(@Body() dto: CreateStockIssuanceHttpDto, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    const command = new CreateStockIssuanceCommand(
      dto.warehouseId,
      dto.destinationType,
      dto.destinationId,
      dto.lines,
    )
    return this.issuanceService.create(command, userId)
  }

  @Post('issuances/:id/reverse')
  @RequirePermissions('issuances:update')
  async reverseIssuance(
    @Param('id') id: string,
    @Body() dto: ReverseIssuanceHttpDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    return this.issuanceService.reverse(id, dto.reason, userId)
  }

  // ==================== Stock Opname ====================

  @Get('stock-opname')
  @RequirePermissions('stock-opname:read')
  async getOpnameSessions(
    @Query('warehouse_id') warehouseId?: string,
    @Query('status') status?: string,
  ) {
    return this.opnameService.findAll({ warehouseId, status })
  }

  @Get('stock-opname/:id')
  @RequirePermissions('stock-opname:read')
  async getOpnameSession(@Param('id') id: string) {
    return this.opnameService.findById(id)
  }

  @Post('stock-opname')
  @RequirePermissions('stock-opname:create')
  async createOpname(@Body() dto: CreateStockOpnameHttpDto, @Req() req: any) {
    const userId = req.user?.id ?? 'unknown'
    const command = new CreateStockOpnameSessionCommand(dto.warehouseId)
    return this.opnameService.create(command.warehouseId, userId)
  }

  @Patch('stock-opname/:id/counts')
  @RequirePermissions('stock-opname:update')
  async updateOpnameCounts(
    @Param('id') id: string,
    @Body() dto: UpdateOpnameCountsHttpDto,
  ) {
    const command = new UpdateOpnameCountsCommand(dto.lines)
    return this.opnameService.updateCounts(id, command.lines)
  }

  @Patch('stock-opname/:id/submit')
  @RequirePermissions('stock-opname:update')
  async submitOpname(@Param('id') id: string) {
    return this.opnameService.submit(id)
  }

  @Patch('stock-opname/:id/approve')
  @RequirePermissions('stock-opname:approve')
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
  @RequirePermissions('equipment:create')
  async createEquipment(@Body() dto: CreateEquipmentHttpDto) {
    const command = new CreateEquipmentCommand(
      dto.name,
      dto.type,
      dto.siteId,
      dto.serialNumber,
      dto.purchaseDate,
    )
    return this.equipmentService.create(command)
  }

  @Put('equipment/:id')
  @RequirePermissions('equipment:update')
  async updateEquipment(@Param('id') id: string, @Body() dto: UpdateEquipmentHttpDto) {
    const command = new UpdateEquipmentCommand(
      dto.name,
      dto.type,
      dto.siteId,
      dto.serialNumber,
      dto.status,
      dto.purchaseDate,
    )
    return this.equipmentService.update(id, command)
  }

  @Post('equipment/:id/log-maintenance')
  @RequirePermissions('equipment:update')
  async logMaintenance(
    @Param('id') id: string,
    @Body() dto: LogMaintenanceHttpDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id ?? 'unknown'
    const command = new LogMaintenanceCommand(
      dto.type,
      dto.description,
      dto.cost,
      dto.performedBy,
      dto.nextMaintenanceDate,
    )
    return this.equipmentService.logMaintenance(id, command, userId)
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