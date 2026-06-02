import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('reconciliation_sessions')
export class ReconciliationSessionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  bankAccountId: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'varchar', length: 50, default: 'in_progress' })
  status: string;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  matchedTotal: number;

  @Column({ type: 'integer', default: 0 })
  unmatchedGlCount: number;

  @Column({ type: 'integer', default: 0 })
  unmatchedBankCount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  difference: number;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'timestamp', nullable: true })
  finalizedAt: Date;
}
