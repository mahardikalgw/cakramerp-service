import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type LabPOStatus = 'draft' | 'signed' | 'paid' | 'active' | 'closed';

export class LabPurchaseOrderLine extends BaseEntity {
  declare id: string;
  declare labPurchaseOrderId: string;
  declare testingServiceId: string;
  declare serviceName: string;
  declare quantity: number;
  declare unitPrice: number;
  declare total: number;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabPurchaseOrderLine> & {
      labPurchaseOrderId: string;
      testingServiceId: string;
      serviceName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}

export class LabPurchaseOrder extends BaseEntity {
  declare id: string;
  declare poNumber: string;
  declare customerId: string;
  declare customerName: string;
  declare testingServiceId: string;
  declare sampleQuantity: number;
  declare totalAmount: number;
  declare status: LabPOStatus;
  declare createdBy?: string;
  declare signedBy?: string;
  declare signedAt?: Date;
  declare lines: LabPurchaseOrderLine[];
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<LabPurchaseOrder> & {
      poNumber: string;
      customerId: string;
      customerName: string;
      totalAmount: number;
    },
  ) {
    super();
    Object.assign(this, props);
  }
}
