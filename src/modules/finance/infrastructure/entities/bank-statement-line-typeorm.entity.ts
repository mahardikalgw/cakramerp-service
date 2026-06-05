import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('bank_statement_lines')
export class BankStatementLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare reconciliationSessionId: string;

  @Column({ type: 'date' })
  declare date: Date;

  @Column({ type: 'varchar', length: 500 })
  declare description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare credit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare balance: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare reference: string;

  @Column({ type: 'uuid', nullable: true })
  declare matchedJournalLineId: string;

  @Column({ type: 'varchar', length: 50, default: 'unmatched' })
  declare matchStatus: string;
}
