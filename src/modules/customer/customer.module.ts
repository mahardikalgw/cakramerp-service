import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTypeOrmEntity } from './infrastructure/entities/customer-typeorm.entity';
import { CustomerTypeOrmRepository } from './infrastructure/repositories/customer-typeorm.repository';
import { CustomerService } from './application/services/customer.service';
import { CustomerController } from './infrastructure/http/controllers/customer.controller';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer-repository.port';
import { CUSTOMER_SERVICE } from './application/ports/customer-service.port';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTypeOrmEntity])],
  controllers: [CustomerController],
  providers: [
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: CustomerTypeOrmRepository,
    },
    {
      provide: CUSTOMER_SERVICE,
      useClass: CustomerService,
    },
  ],
  exports: [CUSTOMER_SERVICE, CUSTOMER_REPOSITORY],
})
export class CustomerModule {}
