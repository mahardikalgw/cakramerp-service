import { Injectable, Inject } from '@nestjs/common';
import type { LabActivityAction } from '../../domain/entities/lab-activity-log.entity';
import { LabActivityLog } from '../../domain/entities/lab-activity-log.entity';
import type { LabActivityLogRepositoryPort } from '../../domain/repositories/lab-activity-log-repository.port';
import { LAB_ACTIVITY_LOG_REPOSITORY } from '../../domain/repositories/lab-activity-log-repository.port';

export interface LogActivityDto {
  testingRequestId: string;
  action: LabActivityAction | string;
  performedBy: string;
  performedByName?: string;
  performedByRole?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class LabActivityLogService {
  constructor(
    @Inject(LAB_ACTIVITY_LOG_REPOSITORY)
    private readonly repo: LabActivityLogRepositoryPort,
  ) {}

  async log(dto: LogActivityDto): Promise<LabActivityLog> {
    const entry = new LabActivityLog({
      testingRequestId: dto.testingRequestId,
      action: dto.action,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      performedByRole: dto.performedByRole,
      details: dto.details,
    });
    return this.repo.save(entry);
  }

  async getTimeline(testingRequestId: string): Promise<LabActivityLog[]> {
    return this.repo.findByTestingRequest(testingRequestId);
  }
}
