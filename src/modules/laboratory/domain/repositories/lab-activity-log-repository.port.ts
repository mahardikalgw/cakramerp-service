import { LabActivityLog } from '../entities/lab-activity-log.entity';

export const LAB_ACTIVITY_LOG_REPOSITORY = Symbol(
  'LAB_ACTIVITY_LOG_REPOSITORY',
);

export interface LabActivityLogRepositoryPort {
  save(log: LabActivityLog): Promise<LabActivityLog>;
  findByTestingRequest(
    testingRequestId: string,
    options?: { limit?: number },
  ): Promise<LabActivityLog[]>;
  softDelete(id: string): Promise<void>;
}
