import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SoftDeletableTypeOrmEntity } from '../../../../database/infrastructure/entities/soft-deletable-typeorm-base.entity';
import { PurchaseReturnTypeOrmEntity } from './purchase-return-typeorm.entity';

@Entity('purchase_return_lines')
export class PurchaseReturnLineTypeOrmEntity extends SoftDeletableTypeOrmEntity {
  @Column({ type: 'uuid' })
  declare purchaseReturnId: string;

  @ManyToOne(() => PurchaseReturnTypeOrmEntity, (ret) => ret.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchase_return_id' })
  declare purchaseReturn: PurchaseReturnTypeOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  declare itemId: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  declare uom: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare unitCost: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare totalCost: number;

  @Column({ type: 'text', nullable: true })
  declare reason: string;
}
