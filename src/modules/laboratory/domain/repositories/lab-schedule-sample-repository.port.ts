import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { LabScheduleSample } from '../entities/lab-schedule-sample.entity';

export const LAB_SCHEDULE_SAMPLE_REPOSITORY = Symbol(
  'LAB_SCHEDULE_SAMPLE_REPOSITORY',
);

export interface LabScheduleSampleRepositoryPort extends RepositoryPort<LabScheduleSample> {
  findByScheduleId(scheduleId: string): Promise<LabScheduleSample[]>;
  softDelete(id: string): Promise<void>;
}
