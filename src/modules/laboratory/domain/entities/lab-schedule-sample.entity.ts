import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export class LabScheduleSample extends BaseEntity {
  declare id: string;
  declare scheduleId: string;
  declare contractSampleId: string;
  declare testingServiceId: string | null;
  declare serviceName: string;
  declare sampleCode: string | null;
  declare allocatedQuantity: number;
  declare usedQuantity: number;
  declare completedQuantity: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabScheduleSample> & {
      scheduleId: string;
      contractSampleId: string;
      serviceName: string;
      allocatedQuantity: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
