import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('stock_opname_lines')
export class StockOpnameLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare sessionId: string;

  @Column({ type: 'uuid' })
  declare itemId: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'integer' })
  declare systemQty: number;

  @Column({ type: 'integer' })
  declare actualQty: number;

  @Column({ type: 'integer' })
  declare varianceQty: number;

  @Column({ type: 'varchar', length: 50 })
  declare uom: string;
}
