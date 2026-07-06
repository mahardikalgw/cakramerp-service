import { Entity, Column } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';

@Entity('journal_entries')
export class JournalEntryTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare entryNumber: string;

  @Column({ type: 'date' })
  declare date: Date;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare reference: string | undefined;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'uuid', nullable: true })
  declare projectId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare segment: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare costCenter: string;

  @Column({ type: 'uuid', nullable: true })
  declare createdBy: string | undefined;

  @Column({ type: 'uuid', nullable: true })
  declare approvedBy: string | undefined;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date | undefined;

  @Column({ type: 'uuid', nullable: true })
  declare reversalOfId: string | undefined;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare sourceType: string | undefined;

  @Column({ type: 'uuid', nullable: true })
  declare sourceId: string | undefined;

  @Column({ type: 'varchar', length: 20, default: 'cash' })
  declare journalType: string;

  @Column({ type: 'uuid', nullable: true })
  declare customerId: string | undefined;

  @Column({ type: 'uuid', nullable: true })
  declare supplierId: string | undefined;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare partyName: string | undefined;

  @Column({ type: 'boolean', default: false })
  declare subsidiaryLedgerRecorded: boolean;
}
