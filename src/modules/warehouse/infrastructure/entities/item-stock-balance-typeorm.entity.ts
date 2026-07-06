import { Entity, Column, Index } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Index('IDX_item_stock_balances_item_id', ['itemId'])
@Index('IDX_item_stock_balances_item_warehouse', ['itemId', 'warehouseId'], {
  unique: true,
})
@Entity('item_stock_balances')
export class ItemStockBalanceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare itemId: string;

  @Column({ type: 'uuid' })
  declare warehouseId: string;

  @Column({ type: 'integer', default: 0 })
  declare quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  declare unitCost: number;

  @Column({ type: 'timestamp', nullable: true })
  declare lastMovementDate: Date;
}
