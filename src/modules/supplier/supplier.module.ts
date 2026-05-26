import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SupplierTypeOrmEntity } from './infrastructure/entities/supplier-typeorm.entity'
import { SupplierTypeOrmRepository } from './infrastructure/repositories/supplier-typeorm.repository'
import { SupplierService } from './application/services/supplier.service'
import { SupplierController } from './infrastructure/http/controllers/supplier.controller'
import { SUPPLIER_REPOSITORY } from './domain/repositories/supplier-repository.port'
import { SUPPLIER_SERVICE } from './application/ports/supplier-service.port'

@Module({
  imports: [TypeOrmModule.forFeature([SupplierTypeOrmEntity])],
  controllers: [SupplierController],
  providers: [
    {
      provide: SUPPLIER_REPOSITORY,
      useClass: SupplierTypeOrmRepository,
    },
    {
      provide: SUPPLIER_SERVICE,
      useClass: SupplierService,
    },
  ],
  exports: [SUPPLIER_SERVICE, SUPPLIER_REPOSITORY],
})
export class SupplierModule {}
