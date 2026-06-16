import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CustomerTypeOrmEntity } from './infrastructure/entities/customer-typeorm.entity';
import { CustomerTypeOrmRepository } from './infrastructure/repositories/customer-typeorm.repository';
import { CustomerService } from './application/services/customer.service';
import { CustomerPortalService } from './application/services/customer-portal.service';
import { CustomerController } from './infrastructure/http/controllers/customer.controller';
import { CustomerPortalController } from './infrastructure/http/controllers/customer-portal.controller';
import { CustomerPortalLabController } from './infrastructure/http/controllers/customer-portal-lab.controller';
import { CUSTOMER_REPOSITORY } from './domain/repositories/customer-repository.port';
import { CUSTOMER_SERVICE } from './application/ports/customer-service.port';
import { UserModule } from '../user/user.module';
import { LaboratoryModule } from '../laboratory/laboratory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerTypeOrmEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '7d' },
    }),
    UserModule,
    forwardRef(() => LaboratoryModule),
  ],
  controllers: [CustomerController, CustomerPortalController, CustomerPortalLabController],
  providers: [
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: CustomerTypeOrmRepository,
    },
    {
      provide: CUSTOMER_SERVICE,
      useClass: CustomerService,
    },
    CustomerPortalService,
  ],
  exports: [CUSTOMER_SERVICE, CUSTOMER_REPOSITORY, CustomerPortalService],
})
export class CustomerModule {}
