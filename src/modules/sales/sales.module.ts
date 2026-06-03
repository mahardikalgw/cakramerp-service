import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceModule } from '../finance/finance.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { SalesController } from './infrastructure/http/controllers/sales.controller';
import { QuotationService } from './application/services/quotation.service';
import { SalesOrderService } from './application/services/sales-order.service';
import { SalesReturnService } from './application/services/sales-return.service';
import { QuotationTypeOrmEntity } from './infrastructure/entities/quotation-typeorm.entity';
import { QuotationLineTypeOrmEntity } from './infrastructure/entities/quotation-line-typeorm.entity';
import { SalesOrderTypeOrmEntity } from './infrastructure/entities/sales-order-typeorm.entity';
import { SalesOrderLineTypeOrmEntity } from './infrastructure/entities/sales-order-line-typeorm.entity';
import { SalesReturnTypeOrmEntity } from './infrastructure/entities/sales-return-typeorm.entity';
import { SalesReturnLineTypeOrmEntity } from './infrastructure/entities/sales-return-line-typeorm.entity';
import { SalesWarehouseAdapter } from './application/adapters/sales-warehouse.adapter';
import { SalesFinanceAdapter } from './application/adapters/sales-finance.adapter';
import { SalesTraceabilityService } from './application/services/sales-traceability.service';
import { SalesOrchestratorService } from './application/services/sales-orchestrator.service';

@Module({
  imports: [
    FinanceModule,
    WarehouseModule,
    TypeOrmModule.forFeature([
      QuotationTypeOrmEntity,
      QuotationLineTypeOrmEntity,
      SalesOrderTypeOrmEntity,
      SalesOrderLineTypeOrmEntity,
      SalesReturnTypeOrmEntity,
      SalesReturnLineTypeOrmEntity,
    ]),
  ],
  controllers: [SalesController],
  providers: [
    QuotationService,
    SalesOrderService,
    SalesReturnService,
    SalesWarehouseAdapter,
    SalesFinanceAdapter,
    SalesTraceabilityService,
    SalesOrchestratorService,
  ],
  exports: [
    QuotationService,
    SalesOrderService,
    SalesReturnService,
    SalesWarehouseAdapter,
    SalesFinanceAdapter,
    SalesTraceabilityService,
    SalesOrchestratorService,
  ],
})
export class SalesModule {}
