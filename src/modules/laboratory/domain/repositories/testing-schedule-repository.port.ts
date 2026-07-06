import { RepositoryPort } from '../../../../shared/kernel/domain/repositories/repository.port';
import { TestingSchedule } from '../entities/testing-schedule.entity';

export const TESTING_SCHEDULE_REPOSITORY = Symbol(
  'TESTING_SCHEDULE_REPOSITORY',
);

export interface TestingScheduleRepositoryPort extends RepositoryPort<TestingSchedule> {
  findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<TestingSchedule[]>;
  findByLaboratoryAndDate(
    laboratoryId: string,
    date: string,
  ): Promise<TestingSchedule[]>;
  softDelete(id: string): Promise<void>;
}
