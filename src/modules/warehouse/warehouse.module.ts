import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WarehouseController } from './infrastructure/http/controllers/warehouse.controller'

// Service implementations
import { StockMovementService } from './application/services/stock-movement.service'
import { GoodsReceiptService } from './application/services/goods-receipt.service'
import { StockIssuanceService } from './application/services/stock-issuance.service'
import { StockOpnameService } from './application/services/stock-opname.service'
import { EquipmentService } from './application/services/equipment.service'
import { EquipmentMaintenanceAlertJob } from './application/jobs/equipment-alert.job'

// Repository implementations
import { StockMovementTypeOrmRepository } from './infrastructure/repositories/stock-movement-typeorm.repository'
import { GoodsReceiptTypeOrmRepository } from './infrastructure/repositories/goods-receipt-typeorm.repository'
import { StockIssuanceTypeOrmRepository } from './infrastructure/repositories/stock-issuance-typeorm.repository'
import { StockOpnameTypeOrmRepository } from './infrastructure/repositories/stock-opname-typeorm.repository'
import { EquipmentTypeOrmRepository } from './infrastructure/repositories/equipment-typeorm.repository'

// Port symbols
import { STOCK_MOVEMENT_REPOSITORY } from './domain/repositories/stock-movement-repository.port'
import { GOODS_RECEIPT_REPOSITORY } from './domain/repositories/goods-receipt-repository.port'
import { STOCK_ISSUANCE_REPOSITORY } from './domain/repositories/stock-issuance-repository.port'
import { STOCK_OPNAME_REPOSITORY } from './domain/repositories/stock-opname-repository.port'
import { EQUIPMENT_REPOSITORY } from './domain/repositories/equipment-repository.port'
import { STOCK_MOVEMENT_SERVICE } from './application/ports/stock-movement-service.port'
import { GOODS_RECEIPT_SERVICE } from './application/ports/goods-receipt-service.port'
import { STOCK_ISSUANCE_SERVICE } from './application/ports/stock-issuance-service.port'
import { STOCK_OPNAME_SERVICE } from './application/ports/stock-opname-service.port'
import { EQUIPMENT_SERVICE } from './application/ports/equipment-service.port'

// TypeORM entities
import { ItemTypeOrmEntity } from './infrastructure/entities/item-typeorm.entity'
import { WarehouseTypeOrmEntity } from './infrastructure/entities/warehouse-typeorm.entity'
import { StockLedgerTypeOrmEntity } from './infrastructure/entities/stock-ledger-typeorm.entity'
import { ItemStockBalanceTypeOrmEntity } from './infrastructure/entities/item-stock-balance-typeorm.entity'
import { GoodsReceiptTypeOrmEntity } from './infrastructure/entities/goods-receipt-typeorm.entity'
import { GoodsReceiptLineTypeOrmEntity } from './infrastructure/entities/goods-receipt-line-typeorm.entity'
import { StockIssuanceTypeOrmEntity } from './infrastructure/entities/stock-issuance-typeorm.entity'
import { StockIssuanceLineTypeOrmEntity } from './infrastructure/entities/stock-issuance-line-typeorm.entity'
import { StockOpnameSessionTypeOrmEntity } from './infrastructure/entities/stock-opname-session-typeorm.entity'
import { StockOpnameLineTypeOrmEntity } from './infrastructure/entities/stock-opname-line-typeorm.entity'
import { EquipmentUnitTypeOrmEntity } from './infrastructure/entities/equipment-unit-typeorm.entity'
import { MaintenanceScheduleTypeOrmEntity } from './infrastructure/entities/maintenance-schedule-typeorm.entity'
import { MaintenanceLogTypeOrmEntity } from './infrastructure/entities/maintenance-log-typeorm.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ItemTypeOrmEntity,
      WarehouseTypeOrmEntity,
      StockLedgerTypeOrmEntity,
      ItemStockBalanceTypeOrmEntity,
      GoodsReceiptTypeOrmEntity,
      GoodsReceiptLineTypeOrmEntity,
      StockIssuanceTypeOrmEntity,
      StockIssuanceLineTypeOrmEntity,
      StockOpnameSessionTypeOrmEntity,
      StockOpnameLineTypeOrmEntity,
      EquipmentUnitTypeOrmEntity,
      MaintenanceScheduleTypeOrmEntity,
      MaintenanceLogTypeOrmEntity,
    ]),
  ],
  controllers: [WarehouseController],
  providers: [
    // Repository bindings
    { provide: STOCK_MOVEMENT_REPOSITORY, useClass: StockMovementTypeOrmRepository },
    { provide: GOODS_RECEIPT_REPOSITORY, useClass: GoodsReceiptTypeOrmRepository },
    { provide: STOCK_ISSUANCE_REPOSITORY, useClass: StockIssuanceTypeOrmRepository },
    { provide: STOCK_OPNAME_REPOSITORY, useClass: StockOpnameTypeOrmRepository },
    { provide: EQUIPMENT_REPOSITORY, useClass: EquipmentTypeOrmRepository },
    // Service bindings
    { provide: STOCK_MOVEMENT_SERVICE, useClass: StockMovementService },
    { provide: GOODS_RECEIPT_SERVICE, useClass: GoodsReceiptService },
    { provide: STOCK_ISSUANCE_SERVICE, useClass: StockIssuanceService },
    { provide: STOCK_OPNAME_SERVICE, useClass: StockOpnameService },
    { provide: EQUIPMENT_SERVICE, useClass: EquipmentService },
    // Jobs
    EquipmentMaintenanceAlertJob,
  ],
  exports: [STOCK_MOVEMENT_SERVICE],
})
export class WarehouseModule {}
