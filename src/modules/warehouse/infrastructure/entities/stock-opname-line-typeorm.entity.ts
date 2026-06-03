import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('stock_opname_lines')
export class StockOpnameLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  @Column({ type: 'integer' })
  systemQty: number;

  @Column({ type: 'integer' })
  actualQty: number;

  @Column({ type: 'integer' })
  varianceQty: number;

  @Column({ type: 'varchar', length: 50 })
  uom: string;
}
