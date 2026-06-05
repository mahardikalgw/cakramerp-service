import { Injectable, Inject } from '@nestjs/common';
import { DailyReport } from '../../domain/entities/daily-report.entity';
import type { DailyReportRepositoryPort } from '../../domain/repositories/daily-report-repository.port';
import { DAILY_REPORT_REPOSITORY } from '../../domain/repositories/daily-report-repository.port';
import type { TestResultRepositoryPort } from '../../domain/repositories/test-result-repository.port';
import { TEST_RESULT_REPOSITORY } from '../../domain/repositories/test-result-repository.port';

@Injectable()
export class DailyReportService {
  constructor(
    @Inject(DAILY_REPORT_REPOSITORY)
    private readonly repository: DailyReportRepositoryPort,
    @Inject(TEST_RESULT_REPOSITORY)
    private readonly testResultRepository: TestResultRepositoryPort,
  ) {}

  async findAll(options?: {
    status?: string;
    testingRequestId?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  }) {
    const filters: Record<string, any> = {};
    if (options?.status) filters.status = options.status;
    if (options?.testingRequestId)
      filters.testingRequestId = options.testingRequestId;
    if (options?.customerId) filters.customerId = options.customerId;

    return this.repository.findAll({
      filters,
      page: options?.page,
      limit: options?.limit,
    });
  }

  async findById(id: string): Promise<DailyReport | null> {
    return this.repository.findById(id);
  }

  private generateReportNumber(lastNumber: string | null): string {
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastNumber) {
      const match = lastNumber.match(/RPT-(\d{4})-(\d+)/);
      if (match && match[1] === year.toString()) {
        seq = parseInt(match[2], 10) + 1;
      }
    }
    return `RPT-${year}-${seq.toString().padStart(5, '0')}`;
  }

  async create(dto: {
    reportDate: string;
    testingRequestId: string;
    testingRequestNumber: string;
    customerId: string;
    customerName: string;
    testResultIds?: string[];
  }): Promise<DailyReport> {
    const lastNumber = await this.repository.getLastReportNumber();
    const reportNumber = this.generateReportNumber(lastNumber);

    const lines: any[] = [];
    if (dto.testResultIds?.length) {
      for (const resultId of dto.testResultIds) {
        const testResult = await this.testResultRepository.findById(resultId);
        if (testResult) {
          lines.push({
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            dailyReportId: undefined,
            testResultId: testResult.id,
            resultNumber: testResult.resultNumber,
            sampleCode: testResult.sampleCode,
            serviceName: testResult.serviceName,
            parameter: testResult.parameter,
            resultValue: testResult.resultValue,
          });
        }
      }
    }

    const entity = new DailyReport({
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      reportNumber,
      reportDate: dto.reportDate,
      testingRequestId: dto.testingRequestId,
      testingRequestNumber: dto.testingRequestNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      status: 'draft',
      lines,
    } as any);

    return this.repository.save(entity);
  }

  async submit(id: string): Promise<DailyReport> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Daily report not found');
    if (existing.status !== 'draft')
      throw new Error('Only draft reports can be submitted');

    existing.status = 'submitted';
    existing.submittedAt = new Date();
    return this.repository.save(existing);
  }

  async approve(id: string, userId: string): Promise<DailyReport> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Daily report not found');
    if (existing.status !== 'submitted')
      throw new Error('Only submitted reports can be approved');

    existing.status = 'approved';
    existing.approvedById = userId;
    existing.approvedAt = new Date();
    return this.repository.save(existing);
  }

  async requestRevision(id: string, reason: string): Promise<DailyReport> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new Error('Daily report not found');

    existing.status = 'revision_requested';
    existing.rejectionReason = reason;
    return this.repository.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
