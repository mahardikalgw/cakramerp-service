import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { SalesReturnLineTypeOrmEntity } from './sales-return-line-typeorm.entity';

@Entity('sales_returns')
export class SalesReturnTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  returnNumber: string;

  @Column({ type: 'uuid', nullable: true })
  salesOrderId: string | null;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'varchar', length: 255 })
  customerName: string;

  @Column({ type: 'date' })
  returnDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  glPostingQueueId: string | null;

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string | null;

  @OneToMany(() => SalesReturnLineTypeOrmEntity, (line) => line.salesReturn, {
    cascade: true,
    eager: true,
  })
  lines: SalesReturnLineTypeOrmEntity[];
}
