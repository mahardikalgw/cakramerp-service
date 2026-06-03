import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';
import { PurchaseReturnTypeOrmEntity } from './purchase-return-typeorm.entity';

@Entity('purchase_return_lines')
export class PurchaseReturnLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  purchaseReturnId: string;

  @ManyToOne(() => PurchaseReturnTypeOrmEntity, (ret) => ret.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchaseReturnId' })
  purchaseReturn: PurchaseReturnTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  itemId: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uom: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalCost: number;

  @Column({ type: 'text', nullable: true })
  reason: string;
}
