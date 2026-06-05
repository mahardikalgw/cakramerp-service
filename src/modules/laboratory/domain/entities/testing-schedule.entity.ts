import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type ScheduleStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'completed'
  | 'cancelled';

export class TestingSchedule extends BaseEntity {
  declare id: string;
  declare scheduleDate: Date | string;
  declare timeSlot: string;
  declare laboratoryId: string;
  declare laboratoryName: string;
  declare testingRequestId: string | null;
  declare testingRequestNumber: string | null;
  declare sampleId: string | null;
  declare sampleCode: string | null;
  declare technicianId: string | null;
  declare technicianName: string | null;
  declare notes: string | null;
  declare status: ScheduleStatus;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<TestingSchedule> & {
      scheduleDate: Date | string;
      timeSlot: string;
      laboratoryId: string;
      laboratoryName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
