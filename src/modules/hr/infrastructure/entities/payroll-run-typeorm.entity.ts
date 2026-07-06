import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('payroll_runs')
export class PayrollRunTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'integer' })
  declare month: number;

  @Column({ type: 'integer' })
  declare year: number;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalGross: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalNet: number;

  @Column({ type: 'integer', default: 0 })
  declare totalEmployees: number;

  @Column({ type: 'timestamp', nullable: true })
  declare confirmedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare confirmedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare postedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare postedBy: string;
}
