import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { PurchaseReturnLineTypeOrmEntity } from './purchase-return-line-typeorm.entity';

@Entity('purchase_returns')
export class PurchaseReturnTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  declare returnNumber: string;

  @Column({ type: 'uuid', nullable: true })
  declare purchaseOrderId: string;

  @Column({ type: 'uuid' })
  declare supplierId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare supplierName: string;

  @Column({ type: 'date' })
  declare returnDate: Date;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare totalAmount: number;

  @Column({ type: 'text', nullable: true })
  declare reason: string;

  @Column({ type: 'uuid', nullable: true })
  declare approvedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  declare rejectionReason: string;

  @Column({ type: 'uuid', nullable: true })
  declare glPostingQueueId: string;

  @Column({ type: 'uuid', nullable: true })
  declare journalEntryId: string;

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
