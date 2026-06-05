import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type SampleStatus =
  | 'awaiting_delivery'
  | 'received'
  | 'processing'
  | 'completed';

export class Sample extends BaseEntity {
  declare id: string;
  declare sampleCode: string;
  declare sampleTypeId: string;
  declare sampleTypeName: string;
  declare testingRequestId: string | null;
  declare testingRequestNumber: string | null;
  declare customerId: string;
  declare customerName: string;
  declare weight: number | null;
  declare location: string | null;
  declare description: string | null;
  declare status: SampleStatus;
  declare receivedAt: Date | null;
  declare receivedBy: string | null;
  declare notes: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<Sample> & {
      sampleCode: string;
      sampleTypeId: string;
      sampleTypeName: string;
      customerId: string;
      customerName: string;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
