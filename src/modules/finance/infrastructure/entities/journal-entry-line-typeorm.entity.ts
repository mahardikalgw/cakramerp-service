import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('journal_entry_lines')
export class JournalEntryLineTypeOrmEntity extends TypeOrmBaseEntity {
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
