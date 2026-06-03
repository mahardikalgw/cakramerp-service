import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceModule } from '../finance/finance.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { PurchaseController } from './infrastructure/http/controllers/purchase.controller';
import { PurchaseRequestService } from './application/services/purchase-request.service';
import { PurchaseOrderService } from './application/services/purchase-order.service';
import { PurchaseReturnService } from './application/services/purchase-return.service';
import { PurchaseRequestTypeOrmEntity } from './infrastructure/entities/purchase-request-typeorm.entity';
import { PurchaseRequestLineTypeOrmEntity } from './infrastructure/entities/purchase-request-line-typeorm.entity';
import { PurchaseOrderTypeOrmEntity } from './infrastructure/entities/purchase-order-typeorm.entity';
import { PurchaseOrderLineTypeOrmEntity } from './infrastructure/entities/purchase-order-line-typeorm.entity';
import { PurchaseReturnTypeOrmEntity } from './infrastructure/entities/purchase-return-typeorm.entity';
import { PurchaseReturnLineTypeOrmEntity } from './infrastructure/entities/purchase-return-line-typeorm.entity';
import { PurchaseOrderTypeOrmRepository } from './infrastructure/repositories/purchase-order-typeorm.repository';
import { PURCHASE_ORDER_REPOSITORY } from './domain/repositories/purchase-order-repository.port';
import { ProcurementWarehouseAdapter } from './application/adapters/procurement-warehouse.adapter';
import { ProcurementFinanceAdapter } from './application/adapters/procurement-finance.adapter';
import { TraceabilityService } from './application/services/traceability.service';
import { PurchaseOrchestratorService } from './application/services/purchase-orchestrator.service';

@Module({
  imports: [
    FinanceModule,
    WarehouseModule,
    TypeOrmModule.forFeature([
      PurchaseRequestTypeOrmEntity,
      PurchaseRequestLineTypeOrmEntity,
      PurchaseOrderTypeOrmEntity,
      PurchaseOrderLineTypeOrmEntity,
      PurchaseReturnTypeOrmEntity,
      PurchaseReturnLineTypeOrmEntity,
    ]),
  ],
  controllers: [PurchaseController],
  providers: [
    {
      provide: PURCHASE_ORDER_REPOSITORY,
      useClass: PurchaseOrderTypeOrmRepository,
    },
    PurchaseRequestService,
    PurchaseOrderService,
    PurchaseReturnService,
    ProcurementWarehouseAdapter,
    ProcurementFinanceAdapter,
    TraceabilityService,
    PurchaseOrchestratorService,
  ],
  exports: [
    PurchaseRequestService,
    PurchaseOrderService,
    PurchaseReturnService,
    ProcurementWarehouseAdapter,
    ProcurementFinanceAdapter,
    TraceabilityService,
    PurchaseOrchestratorService,
  ],
})
export class PurchasingModule {}
