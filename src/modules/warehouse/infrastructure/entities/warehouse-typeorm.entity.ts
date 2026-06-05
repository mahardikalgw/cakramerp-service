import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('warehouses')
export class WarehouseTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 255 })
  declare location: string;

  @Column({ type: 'varchar', length: 50 })
  declare type: string;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
