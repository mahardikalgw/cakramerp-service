import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('bank_statement_lines')
export class BankStatementLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  reconciliationSessionId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  balance: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'uuid', nullable: true })
  matchedJournalLineId: string;

  @Column({ type: 'varchar', length: 50, default: 'unmatched' })
  matchStatus: string;
}
