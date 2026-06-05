import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('thr_records')
export class ThrRecordTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare employeeId: string;

  @Column({ type: 'varchar', length: 255 })
  declare employeeName: string;

  @Column({ type: 'integer' })
  declare year: number;

  @Column({ type: 'varchar', length: 50 })
  declare employmentType: string;

  @Column({ type: 'integer' })
  declare monthsOfService: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare monthlySalary: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare thrAmount: number;

  @Column({ type: 'boolean' })
  declare isProRated: boolean;

  @Column({ type: 'boolean' })
  declare isExcluded: boolean;

  @Column({ type: 'varchar', length: 50, default: 'calculated' })
  declare status: string;

  @Column({ type: 'timestamp', nullable: true })
  declare confirmedAt: Date;
}
