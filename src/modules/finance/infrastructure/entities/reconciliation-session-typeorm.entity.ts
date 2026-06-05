import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('reconciliation_sessions')
export class ReconciliationSessionTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare bankAccountId: string;

  @Column({ type: 'date' })
  declare periodStart: Date;

  @Column({ type: 'date' })
  declare periodEnd: Date;

  @Column({ type: 'varchar', length: 50, default: 'in_progress' })
  declare status: string;

  @Column({ type: 'boolean', default: false })
  declare isLocked: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare matchedTotal: number;

  @Column({ type: 'integer', default: 0 })
  declare unmatchedGlCount: number;

  @Column({ type: 'integer', default: 0 })
  declare unmatchedBankCount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare difference: number;

  @Column({ type: 'uuid' })
  declare createdBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare finalizedAt: Date;
}
