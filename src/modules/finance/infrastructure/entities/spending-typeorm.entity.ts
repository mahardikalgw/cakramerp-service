import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('spendings')
export class SpendingTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  spendingNumber: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50, default: 'cash' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'uuid', nullable: true })
  glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string;
}
