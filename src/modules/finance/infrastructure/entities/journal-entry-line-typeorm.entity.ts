import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('journal_entry_lines')
export class JournalEntryLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  journalEntryId: string;

  @Column({ type: 'uuid' })
  accountId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;
}
