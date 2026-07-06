import { Entity, Column, OneToMany } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { LabPurchaseOrderLineTypeOrmEntity } from './lab-purchase-order-line-typeorm.entity';

@Entity('lab_purchase_orders')
export class LabPurchaseOrderTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare poNumber: string;

  @Column({ type: 'uuid' })
  declare customerId: string;

  @Column({ type: 'varchar', length: 255 })
  declare customerName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare totalAmount: number;

  @Column({ type: 'int', nullable: true })
  declare sampleQuantity: number;

  @Column({ type: 'varchar', length: 50, default: 'draft' })
  declare status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare createdBy: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare signedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  declare signedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  declare purchaseOrderId: string;

  @Column({ type: 'text', nullable: true, name: 'document_url' })
  declare documentUrl: string | null;

  @OneToMany(
    () => LabPurchaseOrderLineTypeOrmEntity,
    (line) => line.labPurchaseOrder,
    {
      cascade: true,
      eager: true,
    },
  )
  lines: LabPurchaseOrderLineTypeOrmEntity[];
}
