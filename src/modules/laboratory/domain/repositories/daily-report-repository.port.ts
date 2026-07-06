import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { DailyReport } from '../entities/daily-report.entity';

export const DAILY_REPORT_REPOSITORY = Symbol('DAILY_REPORT_REPOSITORY');

export interface DailyReportRepositoryPort extends RepositoryPort<DailyReport> {
  findByReportNumber(reportNumber: string): Promise<DailyReport | null>;
  getLastReportNumber(): Promise<string | null>;
  findByTestingRequestId(testingRequestId: string): Promise<DailyReport[]>;
  softDelete(id: string): Promise<void>;
}
