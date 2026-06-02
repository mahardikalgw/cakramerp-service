import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('payroll_runs')
export class PayrollRunTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'integer' })
  month: number;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalGross: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalNet: number;

  @Column({ type: 'integer', default: 0 })
  totalEmployees: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  confirmedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  postedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  postedBy: string;
}
