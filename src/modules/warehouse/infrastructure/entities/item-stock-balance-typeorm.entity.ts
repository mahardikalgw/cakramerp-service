import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('item_stock_balances')
export class ItemStockBalanceTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'integer', default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitCost: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMovementDate: Date;
}
