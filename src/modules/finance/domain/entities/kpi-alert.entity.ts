import { BaseEntity } from '../../../../shared/kernel/domain/entities/base.entity';

export type KpiAlertStatus = 'unread' | 'read' | 'dismissed';

export class KpiAlert extends BaseEntity {
  declare id: string;
  declare type: string;
  declare message: string;
  declare severity: 'low' | 'medium' | 'high' | 'critical';
  declare status: KpiAlertStatus;
  declare relatedValue: number;
  declare thresholdValue: number;
  declare relatedUrl?: string;
  declare createdAt: Date;
  declare updatedAt: Date;

  constructor(
    props: Partial<KpiAlert> & {
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      relatedValue: number;
      thresholdValue: number;
    },
  ) {
    super();
    Object.assign(this, props);
    this.status = props.status ?? 'unread';
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
