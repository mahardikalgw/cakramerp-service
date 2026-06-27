import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queues/queue.module';
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
import { LaboratoryModule } from './modules/laboratory/laboratory.module';
import { SpendingModule } from './modules/spending/spending.module';
import { HealthModule } from './modules/shared/infrastructure/health/health.module';
import { DocumentGenerationModule } from './modules/shared/infrastructure/document-generation/document-generation.module';
import { UserThrottlerGuard } from './modules/shared/infrastructure/guards/user-throttler.guard';
import { envConfig } from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        autoLogging: true,
        serializers: {
          req(req) {
            return { method: req.method, url: req.url };
          },
        },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'short', ttl: 1_000, limit: 100 },
        { name: 'medium', ttl: 10_000, limit: 300 },
        { name: 'api', ttl: 60_000, limit: 1000 },
        { name: 'auth', ttl: 60_000, limit: 200 },
        { name: 'upload', ttl: 60_000, limit: 100 },
        { name: 'write', ttl: 10_000, limit: 100 },
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        const ttlMs = (envConfig.redis?.ttl ?? 300) * 1000;
        if (envConfig.redis?.url || envConfig.redis?.host) {
          return { ttl: ttlMs } as any;
        }
        return { ttl: ttlMs } as any;
      },
    }),
    ScheduleModule.forRoot(),
    TerminusModule,
    DatabaseModule,
    QueueModule,
    HealthModule,
    DocumentGenerationModule,
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
    LaboratoryModule,
    SpendingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
