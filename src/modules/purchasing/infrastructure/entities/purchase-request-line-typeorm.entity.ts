import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseRequestTypeOrmEntity } from './purchase-request-typeorm.entity';

@Entity('purchase_request_lines')
export class PurchaseRequestLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  purchaseRequestId: string;

  @ManyToOne(() => PurchaseRequestTypeOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseRequestId' })
  purchaseRequest: PurchaseRequestTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  itemId: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ type: 'varchar', length: 50, default: 'goods' })
  lineType: string;
}
