import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { SelfServiceModule } from './modules/self-service/self-service.module';
import { CustomerModule } from './modules/customer';
import { SupplierModule } from './modules/supplier';

@Module({
  imports: [
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
    SelfServiceModule,
    CustomerModule,
    SupplierModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
