import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('ap_subsidiary_ledger')
export class ApSubsidiaryLedgerTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ type: 'uuid' })
  declare supplierId: string;

  @Column({ type: 'varchar', length: 255 })
  declare supplierName: string;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  declare invoiceId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare invoiceNumber: string;

  @Column({ type: 'date' })
  declare date: Date;

  @Column({ type: 'text' })
  declare description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare credit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare balance: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  declare createdAt: Date;
}
