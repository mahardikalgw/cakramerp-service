import { Entity, Column, Index } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Index('IDX_journal_entry_lines_journal_entry_id', ['journalEntryId'])
@Index('IDX_journal_entry_lines_account_id', ['accountId'])
@Entity('journal_entry_lines')
export class JournalEntryLineTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare journalEntryId: string;

  @Column({ type: 'uuid' })
  declare accountId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare credit: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare description: string;
}
