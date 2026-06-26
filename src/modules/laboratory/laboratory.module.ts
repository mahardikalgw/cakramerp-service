import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LabPurchasingAdapter } from './application/adapters/lab-purchasing.adapter';

// Phase 1: Master Data
import { TestingServiceController } from './infrastructure/http/controllers/testing-service.controller';
import { LaboratoryController } from './infrastructure/http/controllers/laboratory.controller';
import { SampleTypeController } from './infrastructure/http/controllers/sample-type.controller';
import { TestingServiceService } from './application/services/testing-service.service';
import { LaboratoryService } from './application/services/laboratory.service';
import { SampleService } from './application/services/sample.service';
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
import { SampleQuotaTypeOrmEntity } from './infrastructure/entities/sample-quota-typeorm.entity';
import { SampleQuotaTypeOrmRepository } from './infrastructure/repositories/sample-quota-typeorm.repository';
import { SAMPLE_QUOTA_REPOSITORY } from './domain/repositories/sample-quota-repository.port';

// Phase 4: Samples & Schedules
import { SampleController } from './infrastructure/http/controllers/sample.controller';
import { TestingScheduleController } from './infrastructure/http/controllers/testing-schedule.controller';
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

// Phase 6: Activity Log
import { LabActivityLogTypeOrmEntity } from './infrastructure/entities/lab-activity-log-typeorm.entity';
import { LabActivityLogTypeOrmRepository } from './infrastructure/repositories/lab-activity-log-typeorm.repository';
import { LabActivityLogService } from './application/services/lab-activity-log.service';
import { LAB_ACTIVITY_LOG_REPOSITORY } from './domain/repositories/lab-activity-log-repository.port';

// Phase 7: Lab Report Generation
import { LabReportService } from './application/services/lab-report.service';

// Phase 8: Verification & Activation
import { VerificationController } from './infrastructure/http/controllers/verification.controller';
import { VerificationService } from './application/services/verification.service';
import { VerificationTypeOrmEntity } from './infrastructure/entities/verification-typeorm.entity';
import { VerificationChecklistItemTypeOrmEntity } from './infrastructure/entities/verification-checklist-item-typeorm.entity';
import { VerificationTypeOrmRepository } from './infrastructure/repositories/verification-typeorm.repository';
import { VERIFICATION_REPOSITORY } from './domain/repositories/verification-repository.port';

// Phase 9: Closing Module
import { ClosingController } from './infrastructure/http/controllers/closing.controller';
import { ClosingService } from './application/services/closing.service';
import { ClosingTypeOrmEntity } from './infrastructure/entities/closing-typeorm.entity';
import { ClosingChecklistItemTypeOrmEntity } from './infrastructure/entities/closing-checklist-item-typeorm.entity';
import { ClosingTypeOrmRepository } from './infrastructure/repositories/closing-typeorm.repository';
import { CLOSING_REPOSITORY } from './domain/repositories/closing-repository.port';

// Phase 10: Contract Invoice Module
import { ContractInvoiceTypeOrmEntity } from './infrastructure/entities/contract-invoice-typeorm.entity';
import { ContractInvoiceTypeOrmRepository } from './infrastructure/repositories/contract-invoice-typeorm.repository';
import { CONTRACT_INVOICE_REPOSITORY } from './domain/repositories/contract-invoice-repository.port';
import { ContractInvoiceService } from './application/services/contract-invoice.service';
import { ContractInvoiceController } from './infrastructure/http/controllers/contract-invoice.controller';

// Phase 11: Contract Test Invoice Module (per-schedule billing for sample tests)
import { ContractTestInvoiceTypeOrmEntity } from './infrastructure/entities/contract-test-invoice-typeorm.entity';
import { ContractTestInvoiceResultTypeOrmEntity } from './infrastructure/entities/contract-test-invoice-result-typeorm.entity';
import { ContractTestInvoiceTypeOrmRepository } from './infrastructure/repositories/contract-test-invoice-typeorm.repository';
import { CONTRACT_TEST_INVOICE_REPOSITORY } from './domain/repositories/contract-test-invoice-repository.port';
import { ContractTestInvoiceService } from './application/services/contract-test-invoice.service';
import { ContractTestInvoiceController } from './infrastructure/http/controllers/contract-test-invoice.controller';

// Phase 10: Report Distribution & Archive
import { ReportDistributionController } from './infrastructure/http/controllers/report-distribution.controller';
import { ReportDistributionService } from './application/services/report-distribution.service';
import { ReportDistributionTypeOrmEntity } from './infrastructure/entities/report-distribution-typeorm.entity';
import { ArchivedDocumentTypeOrmEntity } from './infrastructure/entities/archived-document-typeorm.entity';
import { ReportDistributionTypeOrmRepository } from './infrastructure/repositories/report-distribution-typeorm.repository';
import { ArchivedDocumentTypeOrmRepository } from './infrastructure/repositories/archived-document-typeorm.repository';
import { REPORT_DISTRIBUTION_REPOSITORY } from './domain/repositories/report-distribution-repository.port';
import { ARCHIVED_DOCUMENT_REPOSITORY } from './domain/repositories/report-distribution-repository.port';

// Phase 11: Certificate Module
import { LabCertificateController } from './infrastructure/http/controllers/lab-certificate.controller';
import { LabCertificateService } from './application/services/lab-certificate.service';
import { LabCertificateTypeOrmEntity } from './infrastructure/entities/lab-certificate-typeorm.entity';
import { LabCertificateTypeOrmRepository } from './infrastructure/repositories/lab-certificate-typeorm.repository';
import { LAB_CERTIFICATE_REPOSITORY } from './domain/repositories/lab-certificate-repository.port';

// Phase 12: Quota Monitoring
import { QuotaMonitoringService } from './application/services/quota-monitoring.service';

// Phase 13: Dashboard
import { LabDashboardController } from './infrastructure/http/controllers/lab-dashboard.controller';
import { LabDashboardService } from './application/services/lab-dashboard.service';

// Phase 14: Notifications
import { NotificationController } from './infrastructure/http/controllers/notification.controller';
import { NotificationService } from './application/services/notification.service';
import { NotificationEventService } from './application/services/notification-event.service';
import { EmailNotificationService } from './application/services/email-notification.service';
import { PushNotificationService } from './application/services/push-notification.service';
import { NotificationTypeOrmEntity } from './infrastructure/entities/notification-typeorm.entity';
import { DeviceTokenTypeOrmEntity } from './infrastructure/entities/device-token-typeorm.entity';
import { EmailDeliveryLogTypeOrmEntity } from './infrastructure/entities/email-delivery-log-typeorm.entity';
import { NotificationTypeOrmRepository } from './infrastructure/repositories/notification-typeorm.repository';
import { DeviceTokenTypeOrmRepository } from './infrastructure/repositories/device-token-typeorm.repository';
import { EmailDeliveryLogTypeOrmRepository } from './infrastructure/repositories/email-delivery-log-typeorm.repository';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification-repository.port';
import { DEVICE_TOKEN_REPOSITORY } from './domain/repositories/device-token-repository.port';
import { EMAIL_DELIVERY_LOG_REPOSITORY } from './domain/repositories/email-delivery-log-repository.port';

// Phase 15: Payment Methods & Evidence
import { LabPaymentController } from './infrastructure/http/controllers/lab-payment.controller';
import { LabPaymentService } from './application/services/lab-payment.service';
import { PaymentMethodTypeOrmEntity } from './infrastructure/entities/payment-method-typeorm.entity';
import { PaymentEvidenceTypeOrmEntity } from './infrastructure/entities/payment-evidence-typeorm.entity';
import { PaymentMethodTypeOrmRepository } from './infrastructure/repositories/payment-method-typeorm.repository';
import { PaymentEvidenceTypeOrmRepository } from './infrastructure/repositories/payment-evidence-typeorm.repository';
import { PAYMENT_METHOD_REPOSITORY } from './domain/repositories/payment-repository.port';
import { PAYMENT_EVIDENCE_REPOSITORY } from './domain/repositories/payment-repository.port';
import { DocumentGenerationModule } from '../shared/infrastructure/document-generation/document-generation.module';
import { SalesModule } from '../sales/sales.module';
import { CustomerModule } from '../customer/customer.module';
import { UserModule } from '../user/user.module';

// Phase 16: Post-Approval Workflow
import { PostApprovalLabContractController } from './infrastructure/http/controllers/post-approval-lab-contract.controller';
import { PostApprovalTestingScheduleController } from './infrastructure/http/controllers/post-approval-testing-schedule.controller';
import { PostApprovalTestingResultController } from './infrastructure/http/controllers/post-approval-testing-result.controller';
import { PostApprovalDocumentArchiveController } from './infrastructure/http/controllers/post-approval-document-archive.controller';
import { PostApprovalLabContractService } from './application/services/post-approval-lab-contract.service';
import { PostApprovalTestingScheduleService } from './application/services/post-approval-testing-schedule.service';
import { PostApprovalTestingResultService } from './application/services/post-approval-testing-result.service';
import { PostApprovalDocumentArchiveService } from './application/services/post-approval-document-archive.service';
import { PostApprovalLabContractTypeOrmRepository } from './infrastructure/repositories/post-approval-lab-contract-typeorm.repository';
import { LabContractSampleTypeOrmRepository } from './infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { PostApprovalTestingScheduleTypeOrmRepository } from './infrastructure/repositories/post-approval-testing-schedule-typeorm.repository';
import { PostApprovalTestingResultTypeOrmRepository } from './infrastructure/repositories/post-approval-testing-result-typeorm.repository';
import { PostApprovalDocumentArchiveTypeOrmRepository } from './infrastructure/repositories/post-approval-document-archive-typeorm.repository';
import { POST_APPROVAL_LAB_CONTRACT_REPOSITORY } from './domain/repositories/post-approval-lab-contract-repository.port';
import { POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY } from './domain/repositories/post-approval-testing-schedule-repository.port';
import { POST_APPROVAL_TESTING_RESULT_REPOSITORY } from './domain/repositories/post-approval-testing-result-repository.port';
import { POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY } from './domain/repositories/post-approval-document-archive-repository.port';
import { LAB_CONTRACT_SAMPLE_REPOSITORY } from './infrastructure/repositories/lab-contract-sample-typeorm.repository';
import { PostApprovalLabContractSampleTypeOrmEntity } from './infrastructure/entities/post-approval-lab-contract-sample-typeorm.entity';
import { PostApprovalDocumentArchiveTypeOrmEntity } from './infrastructure/entities/post-approval-document-archive-typeorm.entity';

// Phase 17: Lab Schedule Samples
import { LabScheduleSampleTypeOrmEntity } from './infrastructure/entities/lab-schedule-sample-typeorm.entity';
import { LabScheduleSampleTypeOrmRepository } from './infrastructure/repositories/lab-schedule-sample-typeorm.repository';
import { LAB_SCHEDULE_SAMPLE_REPOSITORY } from './domain/repositories/lab-schedule-sample-repository.port';

// Phase 18: Contract Cron Jobs
import { ContractSigningDeadlineJob } from './application/jobs/contract-signing-deadline.job';
import { ContractMonthlyBillingJob } from './application/jobs/contract-monthly-billing.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestingServiceTypeOrmEntity,
      LaboratoryTypeOrmEntity,
      SampleTypeTypeOrmEntity,
      TestingRequestTypeOrmEntity,
      TestingRequestLineTypeOrmEntity,
      LabContractTypeOrmEntity,
      LabContractAttachmentTypeOrmEntity,
      LabPurchaseOrderTypeOrmEntity,
      LabPurchaseOrderLineTypeOrmEntity,
      SampleQuotaTypeOrmEntity,
      SampleTypeOrmEntity,
      TestingScheduleTypeOrmEntity,
      TestResultTypeOrmEntity,
      TestResultAttachmentTypeOrmEntity,
      DailyReportTypeOrmEntity,
      DailyReportLineTypeOrmEntity,
      LabActivityLogTypeOrmEntity,
      VerificationTypeOrmEntity,
      VerificationChecklistItemTypeOrmEntity,
      ClosingTypeOrmEntity,
      ClosingChecklistItemTypeOrmEntity,
      ReportDistributionTypeOrmEntity,
      ArchivedDocumentTypeOrmEntity,
      LabCertificateTypeOrmEntity,
      NotificationTypeOrmEntity,
      DeviceTokenTypeOrmEntity,
      EmailDeliveryLogTypeOrmEntity,
      PaymentMethodTypeOrmEntity,
      PaymentEvidenceTypeOrmEntity,
      PostApprovalLabContractSampleTypeOrmEntity,
      PostApprovalDocumentArchiveTypeOrmEntity,
      LabScheduleSampleTypeOrmEntity,
      ContractInvoiceTypeOrmEntity,
      ContractTestInvoiceTypeOrmEntity,
      ContractTestInvoiceResultTypeOrmEntity,
    ]),
    DocumentGenerationModule,
    SalesModule,
    forwardRef(() => CustomerModule),
    UserModule,
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
    VerificationController,
    ClosingController,
    ReportDistributionController,
    LabCertificateController,
    LabDashboardController,
    NotificationController,
    LabPaymentController,
    PostApprovalLabContractController,
    PostApprovalTestingScheduleController,
    PostApprovalTestingResultController,
    PostApprovalDocumentArchiveController,
    ContractInvoiceController,
    ContractTestInvoiceController,
  ],
  providers: [
    {
      provide: TESTING_SERVICE_REPOSITORY,
      useClass: TestingServiceTypeOrmRepository,
    },
    { provide: LABORATORY_REPOSITORY, useClass: LaboratoryTypeOrmRepository },
    { provide: SAMPLE_TYPE_REPOSITORY, useClass: SampleTypeTypeOrmRepository },
    TestingServiceService,
    LaboratoryService,
    SampleTypeService,
    {
      provide: TESTING_REQUEST_REPOSITORY,
      useClass: TestingRequestTypeOrmRepository,
    },
    TestingRequestService,
    {
      provide: LAB_CONTRACT_REPOSITORY,
      useClass: LabContractTypeOrmRepository,
    },
    {
      provide: LAB_PURCHASE_ORDER_REPOSITORY,
      useClass: LabPurchaseOrderTypeOrmRepository,
    },
    {
      provide: SAMPLE_QUOTA_REPOSITORY,
      useClass: SampleQuotaTypeOrmRepository,
    },
    LabContractService,
    LabPOService,
    LabPurchasingAdapter,
    { provide: SAMPLE_REPOSITORY, useClass: SampleTypeOrmRepository },
    {
      provide: TESTING_SCHEDULE_REPOSITORY,
      useClass: TestingScheduleTypeOrmRepository,
    },
    SampleService,
    TestingScheduleService,
    { provide: TEST_RESULT_REPOSITORY, useClass: TestResultTypeOrmRepository },
    {
      provide: DAILY_REPORT_REPOSITORY,
      useClass: DailyReportTypeOrmRepository,
    },
    TestResultService,
    DailyReportService,
    {
      provide: LAB_ACTIVITY_LOG_REPOSITORY,
      useClass: LabActivityLogTypeOrmRepository,
    },
    LabActivityLogService,
    LabReportService,
    {
      provide: VERIFICATION_REPOSITORY,
      useClass: VerificationTypeOrmRepository,
    },
    VerificationService,
    { provide: CLOSING_REPOSITORY, useClass: ClosingTypeOrmRepository },
    ClosingService,
    {
      provide: REPORT_DISTRIBUTION_REPOSITORY,
      useClass: ReportDistributionTypeOrmRepository,
    },
    {
      provide: ARCHIVED_DOCUMENT_REPOSITORY,
      useClass: ArchivedDocumentTypeOrmRepository,
    },
    ReportDistributionService,
    {
      provide: LAB_CERTIFICATE_REPOSITORY,
      useClass: LabCertificateTypeOrmRepository,
    },
    LabCertificateService,
    QuotaMonitoringService,
    LabDashboardService,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationTypeOrmRepository,
    },
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useClass: DeviceTokenTypeOrmRepository,
    },
    {
      provide: EMAIL_DELIVERY_LOG_REPOSITORY,
      useClass: EmailDeliveryLogTypeOrmRepository,
    },
    EmailNotificationService,
    PushNotificationService,
    NotificationService,
    NotificationEventService,
    {
      provide: PAYMENT_METHOD_REPOSITORY,
      useClass: PaymentMethodTypeOrmRepository,
    },
    {
      provide: PAYMENT_EVIDENCE_REPOSITORY,
      useClass: PaymentEvidenceTypeOrmRepository,
    },
    LabPaymentService,
    PostApprovalLabContractService,
    PostApprovalTestingScheduleService,
    {
      provide: POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY,
      useClass: PostApprovalTestingScheduleTypeOrmRepository,
    },
    {
      provide: POST_APPROVAL_TESTING_RESULT_REPOSITORY,
      useClass: PostApprovalTestingResultTypeOrmRepository,
    },
    PostApprovalTestingResultService,
    {
      provide: POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY,
      useClass: PostApprovalDocumentArchiveTypeOrmRepository,
    },
    PostApprovalDocumentArchiveService,
    {
      provide: POST_APPROVAL_LAB_CONTRACT_REPOSITORY,
      useClass: PostApprovalLabContractTypeOrmRepository,
    },
    {
      provide: CONTRACT_INVOICE_REPOSITORY,
      useClass: ContractInvoiceTypeOrmRepository,
    },
    ContractInvoiceService,
    {
      provide: CONTRACT_TEST_INVOICE_REPOSITORY,
      useClass: ContractTestInvoiceTypeOrmRepository,
    },
    ContractTestInvoiceService,
    {
      provide: LAB_CONTRACT_SAMPLE_REPOSITORY,
      useClass: LabContractSampleTypeOrmRepository,
    },
    {
      provide: LAB_SCHEDULE_SAMPLE_REPOSITORY,
      useClass: LabScheduleSampleTypeOrmRepository,
    },
    ContractSigningDeadlineJob,
    ContractMonthlyBillingJob,
  ],
  exports: [
    TESTING_REQUEST_REPOSITORY,
    LAB_CONTRACT_REPOSITORY,
    LAB_PURCHASE_ORDER_REPOSITORY,
    SAMPLE_QUOTA_REPOSITORY,
    TESTING_SERVICE_REPOSITORY,
    LABORATORY_REPOSITORY,
    SAMPLE_TYPE_REPOSITORY,
    SAMPLE_REPOSITORY,
    TESTING_SCHEDULE_REPOSITORY,
    TEST_RESULT_REPOSITORY,
    DAILY_REPORT_REPOSITORY,
    LAB_ACTIVITY_LOG_REPOSITORY,
    LAB_CERTIFICATE_REPOSITORY,
    VERIFICATION_REPOSITORY,
    CLOSING_REPOSITORY,
    REPORT_DISTRIBUTION_REPOSITORY,
    ARCHIVED_DOCUMENT_REPOSITORY,
    NOTIFICATION_REPOSITORY,
    DEVICE_TOKEN_REPOSITORY,
    EMAIL_DELIVERY_LOG_REPOSITORY,
    NotificationService,
    NotificationEventService,
    PAYMENT_METHOD_REPOSITORY,
    PAYMENT_EVIDENCE_REPOSITORY,
    TestingServiceService,
    LaboratoryService,
    SampleTypeService,
    TestingRequestService,
    LabContractService,
    LabPOService,
    LabPurchasingAdapter,
    SampleService,
    TestingScheduleService,
    TestResultService,
    DailyReportService,
    LabActivityLogService,
    LabReportService,
    VerificationService,
    ClosingService,
    ReportDistributionService,
    LabCertificateService,
    QuotaMonitoringService,
    LabDashboardService,
    NotificationService,
    LabPaymentService,
    PostApprovalLabContractService,
    PostApprovalTestingScheduleService,
    PostApprovalTestingResultService,
    PostApprovalDocumentArchiveService,
    POST_APPROVAL_LAB_CONTRACT_REPOSITORY,
    POST_APPROVAL_TESTING_SCHEDULE_REPOSITORY,
    POST_APPROVAL_TESTING_RESULT_REPOSITORY,
    POST_APPROVAL_DOCUMENT_ARCHIVE_REPOSITORY,
    LAB_SCHEDULE_SAMPLE_REPOSITORY,
    CONTRACT_INVOICE_REPOSITORY,
    ContractInvoiceService,
    ContractTestInvoiceService,
  ],
})
export class LaboratoryModule {}
