import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { SalesReturnLineTypeOrmEntity } from './sales-return-line-typeorm.entity';

@Entity('sales_returns')
export class SalesReturnTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare returnNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare salesOrderId: string | null;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'date' })
  declare returnDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare totalAmount: number;

  @Column({ type: 'text', nullable: true })
  declare reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare approvedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string | null;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string | null;

  @OneToMany(() => SalesReturnLineTypeOrmEntity, (line) => line.salesReturn, {
    cascade: true,
    eager: true,
  })
  lines: SalesReturnLineTypeOrmEntity[];
}
