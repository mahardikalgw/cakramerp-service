import { Entity, Column, OneToMany } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseReturnLineTypeOrmEntity } from './purchase-return-line-typeorm.entity';

@Entity('purchase_returns')
export class PurchaseReturnTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  returnNumber: string;

  @Column({ type: 'uuid', nullable: true })
  purchaseOrderId: string;

  @Column({ type: 'uuid' })
  supplierId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplierName: string;

  @Column({ type: 'date' })
  returnDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'uuid', nullable: true })
  glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  journalEntryId: string;

  @OneToMany(
    () => PurchaseReturnLineTypeOrmEntity,
    (line) => line.purchaseReturn,
    {
      cascade: true,
      eager: true,
    },
  )
  lines: PurchaseReturnLineTypeOrmEntity[];
}
