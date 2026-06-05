import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('stock_issuance_lines')
export class StockIssuanceLineTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'uuid' })
  declare issuanceId: string;

  @Column({ type: 'uuid' })
  declare itemId: string;

  @Column({ type: 'varchar', length: 255 })
  declare itemName: string;

  @Column({ type: 'integer' })
  declare quantity: number;

  @Column({ type: 'varchar', length: 50 })
  declare uom: string;
}
