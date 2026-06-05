import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('spendings')
export class SpendingTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare spendingNumber: string;

  @Column({ type: 'date' })
  declare date: Date;

  @Column({ type: 'varchar', length: 100 })
  declare category: string;

  @Column({ type: 'text' })
  declare description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'varchar', length: 50, default: 'cash' })
  declare paymentMethod: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare reference: string;

  @Column({ type: 'text', nullable: true })
  declare notes: string;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;
}
