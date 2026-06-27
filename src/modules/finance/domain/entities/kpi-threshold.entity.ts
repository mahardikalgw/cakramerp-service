import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type AlertType =
  'min_cash_balance' | 'max_overdue_receivables' | 'project_cost_overrun';

export class KpiThreshold extends BaseEntity {
  declare id: string;
  declare alertType: AlertType;
  declare value: number;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

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
