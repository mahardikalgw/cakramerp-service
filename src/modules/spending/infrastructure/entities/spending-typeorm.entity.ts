import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('spendings')
export class SpendingTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare spendingNumber: string;

  @Column({ type: 'varchar', length: 100 })
  declare expenseCategory: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'date' })
  declare spendingDate: Date;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare vendor: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  declare referenceNo: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'varchar', length: 50 })
  declare paymentMethod: string;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;
}
