import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Phase 1: Master Data
import { TestingServiceController } from './infrastructure/http/controllers/testing-service.controller';
import { LaboratoryController } from './infrastructure/http/controllers/laboratory.controller';
import { SampleTypeController } from './infrastructure/http/controllers/sample-type.controller';
import { TestingServiceService } from './application/services/testing-service.service';
import { LaboratoryService } from './application/services/laboratory.service';
import { SampleTypeService } from './application/services/sample-type.service';
import { TestingServiceTypeOrmEntity } from './infrastructure/entities/testing-service-typeorm.entity';
import { LaboratoryTypeOrmEntity } from './infrastructure/entities/laboratory-typeorm.entity';
import { SampleTypeTypeOrmEntity } from './infrastructure/entities/sample-type-typeorm.entity';
import { TestingServiceTypeOrmRepository } from './infrastructure/repositories/testing-service-typeorm.repository';
import { LaboratoryTypeOrmRepository } from './infrastructure/repositories/laboratory-typeorm.repository';
import { SampleTypeTypeOrmRepository } from './infrastructure/repositories/sample-type-typeorm.repository';
import { TESTING_SERVICE_REPOSITORY } from './domain/repositories/testing-service-repository.port';
import { LABORATORY_REPOSITORY } from './domain/repositories/laboratory-repository.port';
import { SAMPLE_TYPE_REPOSITORY } from './domain/repositories/sample-type-repository.port';

// Phase 2: Testing Requests
import { TestingRequestController } from './infrastructure/http/controllers/testing-request.controller';
import { TestingRequestService } from './application/services/testing-request.service';
import { TestingRequestTypeOrmEntity } from './infrastructure/entities/testing-request-typeorm.entity';
import { TestingRequestLineTypeOrmEntity } from './infrastructure/entities/testing-request-line-typeorm.entity';
import { TestingRequestTypeOrmRepository } from './infrastructure/repositories/testing-request-typeorm.repository';
import { TESTING_REQUEST_REPOSITORY } from './domain/repositories/testing-request-repository.port';

// Phase 3: Contracts & POs
import { LabContractController } from './infrastructure/http/controllers/lab-contract.controller';
import { LabPOController } from './infrastructure/http/controllers/lab-po.controller';
import { LabContractService } from './application/services/lab-contract.service';
import { LabPOService } from './application/services/lab-po.service';
import { LabContractTypeOrmEntity } from './infrastructure/entities/lab-contract-typeorm.entity';
import { LabContractAttachmentTypeOrmEntity } from './infrastructure/entities/lab-contract-attachment-typeorm.entity';
import { LabPurchaseOrderTypeOrmEntity } from './infrastructure/entities/lab-purchase-order-typeorm.entity';
import { LabPurchaseOrderLineTypeOrmEntity } from './infrastructure/entities/lab-purchase-order-line-typeorm.entity';
import { LabContractTypeOrmRepository } from './infrastructure/repositories/lab-contract-typeorm.repository';
import { LabPurchaseOrderTypeOrmRepository } from './infrastructure/repositories/lab-purchase-order-typeorm.repository';
import { LAB_CONTRACT_REPOSITORY } from './domain/repositories/lab-contract-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from './domain/repositories/lab-purchase-order-repository.port';

// Phase 4: Samples & Schedules
import { SampleController } from './infrastructure/http/controllers/sample.controller';
import { TestingScheduleController } from './infrastructure/http/controllers/testing-schedule.controller';
import { SampleService } from './application/services/sample.service';
import { TestingScheduleService } from './application/services/testing-schedule.service';
import { SampleTypeOrmEntity } from './infrastructure/entities/sample-typeorm.entity';
import { TestingScheduleTypeOrmEntity } from './infrastructure/entities/testing-schedule-typeorm.entity';
import { SampleTypeOrmRepository } from './infrastructure/repositories/sample-typeorm.repository';
import { TestingScheduleTypeOrmRepository } from './infrastructure/repositories/testing-schedule-typeorm.repository';
import { SAMPLE_REPOSITORY } from './domain/repositories/sample-repository.port';
import { TESTING_SCHEDULE_REPOSITORY } from './domain/repositories/testing-schedule-repository.port';

// Phase 5: Test Results & Daily Reports
import { TestResultController } from './infrastructure/http/controllers/test-result.controller';
import { DailyReportController } from './infrastructure/http/controllers/daily-report.controller';
import { TestResultService } from './application/services/test-result.service';
import { DailyReportService } from './application/services/daily-report.service';
import { TestResultTypeOrmEntity } from './infrastructure/entities/test-result-typeorm.entity';
import { TestResultAttachmentTypeOrmEntity } from './infrastructure/entities/test-result-attachment-typeorm.entity';
import { DailyReportTypeOrmEntity } from './infrastructure/entities/daily-report-typeorm.entity';
import { DailyReportLineTypeOrmEntity } from './infrastructure/entities/daily-report-line-typeorm.entity';
import { TestResultTypeOrmRepository } from './infrastructure/repositories/test-result-typeorm.repository';
import { DailyReportTypeOrmRepository } from './infrastructure/repositories/daily-report-typeorm.repository';
import { TEST_RESULT_REPOSITORY } from './domain/repositories/test-result-repository.port';
import { DAILY_REPORT_REPOSITORY } from './domain/repositories/daily-report-repository.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Phase 1
      TestingServiceTypeOrmEntity,
      LaboratoryTypeOrmEntity,
      SampleTypeTypeOrmEntity,
      // Phase 2
      TestingRequestTypeOrmEntity,
      TestingRequestLineTypeOrmEntity,
      // Phase 3
      LabContractTypeOrmEntity,
      LabContractAttachmentTypeOrmEntity,
      LabPurchaseOrderTypeOrmEntity,
      LabPurchaseOrderLineTypeOrmEntity,
      // Phase 4
      SampleTypeOrmEntity,
      TestingScheduleTypeOrmEntity,
      // Phase 5
      TestResultTypeOrmEntity,
      TestResultAttachmentTypeOrmEntity,
      DailyReportTypeOrmEntity,
      DailyReportLineTypeOrmEntity,
    ]),
  ],
  controllers: [
    TestingServiceController,
    LaboratoryController,
    SampleTypeController,
    TestingRequestController,
    LabContractController,
    LabPOController,
    SampleController,
    TestingScheduleController,
    TestResultController,
    DailyReportController,
  ],
  providers: [
    // Phase 1
    {
      provide: TESTING_SERVICE_REPOSITORY,
      useClass: TestingServiceTypeOrmRepository,
    },
    { provide: LABORATORY_REPOSITORY, useClass: LaboratoryTypeOrmRepository },
    { provide: SAMPLE_TYPE_REPOSITORY, useClass: SampleTypeTypeOrmRepository },
    TestingServiceService,
    LaboratoryService,
    SampleTypeService,
    // Phase 2
    {
      provide: TESTING_REQUEST_REPOSITORY,
      useClass: TestingRequestTypeOrmRepository,
    },
    TestingRequestService,
    // Phase 3
    {
      provide: LAB_CONTRACT_REPOSITORY,
      useClass: LabContractTypeOrmRepository,
    },
    {
      provide: LAB_PURCHASE_ORDER_REPOSITORY,
      useClass: LabPurchaseOrderTypeOrmRepository,
    },
    LabContractService,
    LabPOService,
    // Phase 4
    { provide: SAMPLE_REPOSITORY, useClass: SampleTypeOrmRepository },
    {
      provide: TESTING_SCHEDULE_REPOSITORY,
      useClass: TestingScheduleTypeOrmRepository,
    },
    SampleService,
    TestingScheduleService,
    // Phase 5
    { provide: TEST_RESULT_REPOSITORY, useClass: TestResultTypeOrmRepository },
    {
      provide: DAILY_REPORT_REPOSITORY,
      useClass: DailyReportTypeOrmRepository,
    },
    TestResultService,
    DailyReportService,
  ],
  exports: [
    TestingServiceService,
    LaboratoryService,
    SampleTypeService,
    TestingRequestService,
    LabContractService,
    LabPOService,
    SampleService,
    TestingScheduleService,
    TestResultService,
    DailyReportService,
  ],
})
export class LaboratoryModule {}
