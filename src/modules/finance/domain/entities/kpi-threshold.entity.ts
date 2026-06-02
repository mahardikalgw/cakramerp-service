import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type AlertType =
  | 'min_cash_balance'
  | 'max_overdue_receivables'
  | 'project_cost_overrun';

export class KpiThreshold extends BaseEntity {
  id: string;
  alertType: AlertType;
  value: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    props: Partial<KpiThreshold> & { alertType: AlertType; value: number },
  ) {
    super();
    Object.assign(this, props);
    this.isActive = props.isActive ?? true;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
