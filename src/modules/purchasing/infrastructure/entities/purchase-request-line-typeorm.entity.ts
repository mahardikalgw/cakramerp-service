import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { PurchaseRequestTypeOrmEntity } from './purchase-request-typeorm.entity';

@Entity('purchase_request_lines')
export class PurchaseRequestLineTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare purchaseRequestId: string;

  @ManyToOne(() => PurchaseRequestTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_request_id' })
  declare purchaseRequest: PurchaseRequestTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  declare itemId: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'text', nullable: true })
  declare description: string;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare uom: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare unitCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  declare taxPercent: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  declare lineType: string;
}
