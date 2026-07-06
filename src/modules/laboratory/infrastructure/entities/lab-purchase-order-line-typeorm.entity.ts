import { Entity, Column, ManyToOne } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { LabPurchaseOrderTypeOrmEntity } from './lab-purchase-order-typeorm.entity';

@Entity('lab_purchase_order_lines')
export class LabPurchaseOrderLineTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare labPurchaseOrderId: string;

  @Column({ type: 'uuid' })
  declare testingServiceId: string;

  @Column({ type: 'varchar', length: 255 })
  declare serviceName: string;

  @Column({ type: 'int', nullable: true })
  declare quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare unitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  declare total: number;

  @ManyToOne(() => LabPurchaseOrderTypeOrmEntity, (order) => order.lines)
  labPurchaseOrder: LabPurchaseOrderTypeOrmEntity;
}
