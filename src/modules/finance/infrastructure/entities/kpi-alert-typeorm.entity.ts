import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('kpi_alerts')
export class KpiAlertTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100 })
  declare type: string;

  @Column({ type: 'text' })
  declare message: string;

  @Column({ type: 'varchar', length: 50 })
  declare severity: string;

  @Column({ type: 'varchar', length: 50, default: 'unread' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare relatedValue: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare thresholdValue: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  declare relatedUrl: string;
}
