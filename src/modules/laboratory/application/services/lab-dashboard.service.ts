import { Injectable, Inject } from '@nestjs/common';
import type { TestingRequestRepositoryPort } from '../../domain/repositories/testing-request-repository.port';
import { TESTING_REQUEST_REPOSITORY } from '../../domain/repositories/testing-request-repository.port';
import type { LabContractRepositoryPort } from '../../domain/repositories/lab-contract-repository.port';
import { LAB_CONTRACT_REPOSITORY } from '../../domain/repositories/lab-contract-repository.port';
import type { LabPurchaseOrderRepositoryPort } from '../../domain/repositories/lab-purchase-order-repository.port';
import { LAB_PURCHASE_ORDER_REPOSITORY } from '../../domain/repositories/lab-purchase-order-repository.port';
import type { SampleRepositoryPort } from '../../domain/repositories/sample-repository.port';
import { SAMPLE_REPOSITORY } from '../../domain/repositories/sample-repository.port';
import type { TestingScheduleRepositoryPort } from '../../domain/repositories/testing-schedule-repository.port';
import { TESTING_SCHEDULE_REPOSITORY } from '../../domain/repositories/testing-schedule-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';
import type { DailyReportRepositoryPort } from '../../domain/repositories/daily-report-repository.port';
import { DAILY_REPORT_REPOSITORY } from '../../domain/repositories/daily-report-repository.port';

@Injectable()
export class LabDashboardService {
  constructor(
    @Inject(TESTING_REQUEST_REPOSITORY)
    private readonly testingRequestRepo: TestingRequestRepositoryPort,
    @Inject(LAB_CONTRACT_REPOSITORY)
    private readonly contractRepo: LabContractRepositoryPort,
    @Inject(LAB_PURCHASE_ORDER_REPOSITORY)
    private readonly poRepo: LabPurchaseOrderRepositoryPort,
    @Inject(SAMPLE_REPOSITORY)
    private readonly sampleRepo: SampleRepositoryPort,
    @Inject(TESTING_SCHEDULE_REPOSITORY)
    private readonly scheduleRepo: TestingScheduleRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepo: TestResultRepositoryPort,
    @Inject(DAILY_REPORT_REPOSITORY)
    private readonly dailyReportRepo: DailyReportRepositoryPort,
  ) {}

  async getAdminDashboard(): Promise<any> {
    // Use limit:1 since meta.total returns the full count regardless of limit
    const activeRequests = await this.testingRequestRepo.findAll({
      filters: { status: 'submitted' },
      limit: 1,
    });
    const activeContracts = await this.contractRepo.findAll({
      filters: { status: 'active' },
      limit: 1,
    });
    const activePOs = await this.poRepo.findAll({
      filters: { status: 'active' },
      limit: 1,
    });
    const todaySchedules = await this.scheduleRepo.findAll({ limit: 1 });

    return {
      activeTestingRequests: activeRequests.meta.total,
      activeContracts: activeContracts.meta.total,
      activePurchaseOrders: activePOs.meta.total,
      todaySchedules: todaySchedules.meta.total,
      requestBreakdown: {
        submitted: (
          await this.testingRequestRepo.findAll({
            filters: { status: 'submitted' },
            limit: 1,
          })
        ).meta.total,
        approved: (
          await this.testingRequestRepo.findAll({
            filters: { status: 'approved' },
            limit: 1,
          })
        ).meta.total,
        assigned: (
          await this.testingRequestRepo.findAll({
            filters: { status: 'assigned' },
            limit: 1,
          })
        ).meta.total,
        testing: (
          await this.testingRequestRepo.findAll({
            filters: { status: 'testing' },
            limit: 1,
          })
        ).meta.total,
        completed: (
          await this.testingRequestRepo.findAll({
            filters: { status: 'completed' },
            limit: 1,
          })
        ).meta.total,
      },
    };
  }

  async getLabDashboard(): Promise<any> {
    const incomingSamples = await this.sampleRepo.findAll({
      filters: { status: 'awaiting_delivery' },
      limit: 1,
    });
    const processingSamples = await this.sampleRepo.findAll({
      filters: { status: 'processing' },
      limit: 1,
    });
    const todaySchedules = await this.scheduleRepo.findAll({ limit: 1 });
    const pendingResults = await this.testResultRepo.findAll({
      filters: { status: 'draft' },
      limit: 1,
    });

    return {
      incomingSamples: incomingSamples.meta.total,
      processingSamples: processingSamples.meta.total,
      todayTestingActivities: todaySchedules.meta.total,
      pendingTestResults: pendingResults.meta.total,
    };
  }

  async getCustomerDashboard(customerId: string): Promise<any> {
    const myRequests = await this.testingRequestRepo.findAll({
      filters: { customerId },
      limit: 1,
    });
    const myContracts = await this.contractRepo.findAll({
      filters: { customerId, status: 'active' },
      limit: 1,
    });
    const myReports = await this.dailyReportRepo.findAll({
      filters: { customerId },
      limit: 1,
    });

    const quotaData = myContracts.data.map((c) => ({
      contractNumber: c.contractNumber,
      totalQuota: c.totalQuota ?? 0,
      usedQuota: c.usedQuota ?? 0,
      remainingQuota: c.remainingQuota ?? 0,
    }));

    return {
      testingRequests: myRequests.meta.total,
      requestBreakdown: {
        submitted: (
          await this.testingRequestRepo.findAll({
            filters: { customerId, status: 'submitted' },
            limit: 1,
          })
        ).meta.total,
        approved: (
          await this.testingRequestRepo.findAll({
            filters: { customerId, status: 'approved' },
            limit: 1,
          })
        ).meta.total,
        completed: (
          await this.testingRequestRepo.findAll({
            filters: { customerId, status: 'completed' },
            limit: 1,
          })
        ).meta.total,
      },
      quota: quotaData,
      latestReports: myReports.data.slice(0, 5),
    };
  }
}
