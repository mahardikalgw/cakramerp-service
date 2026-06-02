import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('kpi_thresholds')
export class KpiThresholdTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  alertType: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  value: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
