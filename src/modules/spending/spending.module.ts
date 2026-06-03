import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceModule } from '../finance/finance.module';
import { SpendingController } from './infrastructure/http/controllers/spending.controller';
import { SpendingService } from './application/services/spending.service';
import { SPENDING_SERVICE } from './application/ports/spending-service.port';
import { SpendingTypeOrmEntity } from './infrastructure/entities/spending-typeorm.entity';
import { SpendingTypeOrmRepository } from './infrastructure/repositories/spending-typeorm.repository';
import { SPENDING_REPOSITORY } from './domain/repositories/spending-repository.port';

@Module({
  imports: [FinanceModule, TypeOrmModule.forFeature([SpendingTypeOrmEntity])],
  controllers: [SpendingController],
  providers: [
    {
      provide: SPENDING_REPOSITORY,
      useClass: SpendingTypeOrmRepository,
    },
    {
      provide: SPENDING_SERVICE,
      useClass: SpendingService,
    },
    SpendingService,
  ],
  exports: [SPENDING_SERVICE, SpendingService],
})
export class SpendingModule {}
