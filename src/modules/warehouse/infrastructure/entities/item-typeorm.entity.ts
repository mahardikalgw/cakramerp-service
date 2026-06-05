import { Entity, Column } from 'typeorm';
import { TypeOrmBaseEntity } from '../../../../database/infrastructure/entities/typeorm-base.entity';

@Entity('items')
export class ItemTypeOrmEntity extends TypeOrmBaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  declare code: string;

  @Column({ type: 'varchar', length: 255 })
  declare name: string;

  @Column({ type: 'varchar', length: 100 })
  declare category: string;

  @Column({ type: 'varchar', length: 50 })
  declare uom: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  declare minStockLevel: number;

  @Column({ type: 'boolean', default: true })
  declare isActive: boolean;
}
