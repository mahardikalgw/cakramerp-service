import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('gl_posting_queue')
export class GlPostingQueueTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50 })
  declare sourceType: string;

  @Column({ type: 'uuid' })
  declare sourceId: string;

  @Column({ type: 'varchar', length: 100 })
  declare sourceNumber: string;

  @Column({ type: 'varchar', length: 50 })
  declare eventType: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  declare amount: number;

  @Column({ type: 'text' })
  declare description: string;

  @Column({ type: 'jsonb', nullable: true })
  declare suggestedLines: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  declare status: string;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;

  @Column({ type: 'uuid', nullable: true })
  declare postedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare postedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare customerId: string;

  @Column({ type: 'uuid', nullable: true })
  declare supplierId: string;

  @Column({ type: 'uuid', nullable: true })
  declare invoiceId: string;

  @Column({ type: 'uuid', nullable: true })
  declare billingLetterId: string;

  @Column({ type: 'uuid', nullable: true })
  declare warehouseId: string;

  @Column({ type: 'uuid', nullable: true })
  declare spendingId: string;
}
