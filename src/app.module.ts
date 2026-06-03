import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { UserThrottlerGuard } from './modules/shared/infrastructure/guards/user-throttler.guard';

/**
 * Named throttler tiers used across the API.
 *
 * - `short` (1s / 20)  : read-heavy endpoints, allows brief bursts.
 * - `medium` (10s / 60) : general API surface, protects against scrapers.
 * - `long` (1m / 300)  : very long window to catch sustained abuse.
 * - `write` (10s / 5)  : tight limit applied to state-changing endpoints
 *                        (approve/reject/deliver/invoice/cancel/convert) via
 *                        the `@Throttle({ write: {} })` decorator.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 20 },
      { name: 'medium', ttl: 10_000, limit: 60 },
      { name: 'long', ttl: 60_000, limit: 300 },
      { name: 'write', ttl: 10_000, limit: 5 },
    ]),
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
  providers: [
    AppService,
    {
      // Apply the user-aware throttler globally. Per-endpoint limits are
      // overridden via `@Throttle({ short: { ttl, limit }, ... })`.
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
