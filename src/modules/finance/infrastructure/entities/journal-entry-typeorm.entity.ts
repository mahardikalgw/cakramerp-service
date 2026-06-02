import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('journal_entries')
export class JournalEntryTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  entryNumber: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  projectId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  segment: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  costCenter: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  reversalOfId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sourceType: string;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string;

  @Column({ type: 'varchar', length: 20, default: 'cash' })
  journalType: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  partyName: string;

  @Column({ type: 'boolean', default: false })
  subsidiaryLedgerRecorded: boolean;
}
