import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user';
import { AuthModule } from './modules/auth';
import { IAMModule } from './modules/iam';
import { AuditModule } from './modules/audit';
import { SettingsModule } from './modules/settings';
import { BackupModule } from './modules/backup';
import { FinanceModule } from './modules/finance/finance.module';
import { HrModule } from './modules/hr/hr.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { SalesModule } from './modules/sales/sales.module';
import { SelfServiceModule } from './modules/self-service/self-service.module';
import { CustomerModule } from './modules/customer';
import { SupplierModule } from './modules/supplier';
import { AssetModule } from './modules/asset/asset.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UserModule,
    AuthModule,
    IAMModule,
    AuditModule,
    SettingsModule,
    BackupModule,
    FinanceModule,
    HrModule,
    WarehouseModule,
    PurchasingModule,
    SalesModule,
    SelfServiceModule,
    CustomerModule,
    SupplierModule,
    AssetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
